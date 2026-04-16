import { Worker, Job } from "bullmq";
import { AnalysisResultSchema } from "@blindspot/shared";
import pino from "pino";

import { ANALYSIS_QUEUE_NAME, ANALYSIS_RESULT_CACHE_TTL_SECONDS } from "../../config/constants";
import { env } from "../../config/env";
import { anthropic } from "../../lib/anthropic";
import { createRedisConnection, redis } from "../../lib/redis";
import { getLLMBackoffMs } from "../../lib/retry-strategies";
import { buildAdversarialPrompt } from "./prompts";
import {
  AnalysisJobData,
  getAnalysisEventChannel,
  publishAnalysisEvent,
  registerAnalysisJobHandler,
  getAnalysisResultCacheKey
} from "./analysis.queue";
import { serializeAnalysis } from "./analysis.service";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Timeout configuration (in ms)
const TIMEOUTS = {
  LLM_CALL: 45000, // 45s for LLM API call
  JOB_TOTAL: 120000, // 2 min total job timeout
  GRACEFUL_SHUTDOWN: 10000 // 10s for graceful worker shutdown
};

/**
 * Wraps async function with timeout
 * Throws AbortError if timeout exceeded
 */
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(`${label} exceeded timeout of ${timeoutMs}ms`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
};

/**
 * Determines if error is retryable
 */
const isRetryableError = (error: Error): boolean => {
  const retryablePatterns = [
    "rate",
    "429",
    "quota",
    "timeout",
    "503",
    "502",
    "connection",
    "ECONNRESET",
    "ETIMEDOUT"
  ];
  
  const errorMsg = error?.message?.toLowerCase() || "";
  return retryablePatterns.some(pattern => errorMsg.includes(pattern));
};

/**
 * Custom retry handler with intelligent backoff
 */
const handleJobRetry = async (
  job: Job<AnalysisJobData>,
  error: Error,
  logger: any
): Promise<number> => {
  const attempt = (job.attemptsMade || 0) + 1;
  const isRetryable = isRetryableError(error);
  
  if (!isRetryable || attempt >= 3) {
    logger.error(
      {
        jobId: job.id,
        error: error.message,
        attempt,
        retryable: isRetryable
      },
      "Job failed and will not retry"
    );
    throw error;
  }
  
  const backoffMs = getLLMBackoffMs(attempt, error);
  logger.warn(
    {
      jobId: job.id,
      attempt,
      backoffMs,
      error: error.message
    },
    "Job will retry with backoff"
  );
  
  // Return delay in ms for BullMQ
  return backoffMs;
};

/**
 * Main job processor
 */
export const processAnalysisJob = async (
  fastify: any,
  job: Job<AnalysisJobData>,
  logger: any
): Promise<void> => {
  const { analysisId, userId, userPlan } = job.data;
  const startedAt = Date.now();
  
  logger.info(
    { analysisId, userId, userPlan, attempt: job.attemptsMade + 1 },
    "Processing analysis job"
  );

  await fastify.prisma.analysis.update({
    where: { id: analysisId },
    data: { status: "PROCESSING" }
  });

  await publishAnalysisEvent(analysisId, {
    event: "processing",
    analysisId,
    status: "PROCESSING",
    message: env.DEMO_MODE ? "Running local demo analysis" : "Adversarial analysis in progress",
    timestamp: new Date().toISOString()
  });

  try {
    const analysis = await withTimeout(
      fastify.prisma.analysis.findUniqueOrThrow({ where: { id: analysisId } }),
      5000,
      "Database fetch"
    );

    if (env.DEMO_MODE) {
      await wait(900);
      const result = buildDemoAnalysisResult(analysis.input);
      const serialized = serializeAnalysis({
        ...analysis,
        status: "COMPLETE",
        summary: result.summary,
        counterarguments: result.counterarguments,
        assumptions: result.assumptions,
        expertPersonas: result.expertPersonas,
        blindSpotReport: result.blindSpotReport,
        confidenceAudit: result.confidenceAudit
      });
      
      await updateAnalysisSuccess(fastify, analysisId, userId, serialized, Date.now() - startedAt, logger);
      return;
    }

    // Call Claude with timeout protection
    const llmResult = await withTimeout(
      (async () => {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3500,
          temperature: 0.4,
          timeout: TIMEOUTS.LLM_CALL, // Built-in timeout
          messages: [
            {
              role: "user",
              content: buildAdversarialPrompt(analysis.input)
            }
          ]
        });

        const text = response.content
          .filter((block: any) => block.type === "text")
          .map((block: any) => block.text)
          .join("");

        return {
          parsed: AnalysisResultSchema.parse(JSON.parse(text)),
          usage: response.usage
        };
      })(),
      TIMEOUTS.LLM_CALL,
      "LLM API call"
    );

    const durationMs = Date.now() - startedAt;

    const updated = await fastify.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "COMPLETE",
        summary: llmResult.parsed.summary,
        counterarguments: llmResult.parsed.counterarguments,
        assumptions: llmResult.parsed.assumptions,
        expertPersonas: llmResult.parsed.expertPersonas,
        blindSpotReport: llmResult.parsed.blindSpotReport,
        confidenceAudit: llmResult.parsed.confidenceAudit,
        inputTokens: llmResult.usage.input_tokens,
        outputTokens: llmResult.usage.output_tokens,
        durationMs
      }
    });

    const completedCount = await fastify.prisma.analysis.count({
      where: { userId, status: "COMPLETE" }
    });

    await fastify.prisma.user.update({
      where: { id: userId },
      data: { analysisCount: completedCount }
    });

    const serialized = serializeAnalysis(updated);
    await redis.set(
      getAnalysisResultCacheKey(analysisId),
      JSON.stringify(serialized),
      "EX",
      ANALYSIS_RESULT_CACHE_TTL_SECONDS
    );

    await publishAnalysisEvent(analysisId, {
      event: "complete",
      analysisId,
      status: "COMPLETE",
      message: "Analysis complete",
      result: serialized.result,
      timestamp: new Date().toISOString(),
      durationMs
    });

    logger.info(
      { analysisId, durationMs, userPlan },
      "Analysis completed successfully"
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const err = error as Error;

    logger.error(
      {
        analysisId,
        error: err.message,
        stack: err.stack,
        durationMs,
        attempt: job.attemptsMade + 1
      },
      "Analysis job failed"
    );

    // Try to update status to failed
    try {
      await fastify.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "FAILED", durationMs }
      });
    } catch (updateError) {
      logger.error(
        { analysisId, error: updateError },
        "Failed to update analysis status"
      );
    }

    await publishAnalysisEvent(analysisId, {
      event: "failed",
      analysisId,
      status: "FAILED",
      message: `Analysis failed: ${err.message}`,
      timestamp: new Date().toISOString(),
      durationMs
    });

    // Intelligent retry
    throw await handleJobRetry(job, err, logger);
  }
};

/**
 * Start the worker with proper error handling
 */
export const startAnalysisWorker = (fastify: any) => {
  if (env.ANALYSIS_EXECUTION_MODE === "inline") {
    return null;
  }

  if (env.DEMO_MODE) {
    registerAnalysisJobHandler(async (analysisId) => {
      const logger = pino();
      const job = {
        data: { analysisId, userId: "demo", userPlan: "FREE" },
        attemptsMade: 0
      } as any;
      await processAnalysisJob(fastify, job, logger);
    });
    return null;
  }

  const logger = fastify.log;
  const worker = new Worker<AnalysisJobData>(
    ANALYSIS_QUEUE_NAME,
    async (job) => {
      // Total job timeout
      return withTimeout(
        processAnalysisJob(fastify, job, logger),
        TIMEOUTS.JOB_TOTAL,
        "Total job processing"
      );
    },
    {
      connection: createRedisConnection() as any,
      concurrency: 4,
      settings: {
        lockDuration: 30000, // 30s lock
        lockRenewTime: 15000, // Renew every 15s
        maxStalledCount: 2 // Remove after 2 stalls
      }
    }
  );

  // Event listeners for observability
  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, "Job failed");
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Job stalled (timeout?)");
  });

  worker.on("error", (error) => {
    logger.error({ error: error.message }, "Worker error");
  });

  fastify.addHook("onClose", async () => {
    logger.info("Gracefully closing worker...");
    await worker.close();
  });

  return worker;
};

// Demo helper
const buildDemoAnalysisResult = (input: string) => 
  AnalysisResultSchema.parse({
    // ... existing demo data
  });

const updateAnalysisSuccess = async (
  fastify: any,
  analysisId: string,
  userId: string,
  serialized: any,
  durationMs: number,
  logger: any
) => {
  await redis.set(
    getAnalysisResultCacheKey(analysisId),
    JSON.stringify(serialized),
    "EX",
    ANALYSIS_RESULT_CACHE_TTL_SECONDS
  );
  
  logger.info({ analysisId, durationMs }, "Analysis succeeded");
};
