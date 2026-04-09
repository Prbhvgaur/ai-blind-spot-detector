import { Worker } from "bullmq";
import { AnalysisResultSchema } from "@blindspot/shared";

import { ANALYSIS_QUEUE_NAME, ANALYSIS_RESULT_CACHE_TTL_SECONDS } from "../../config/constants";
import { env } from "../../config/env";
import { anthropic } from "../../lib/anthropic";
import { createRedisConnection, redis } from "../../lib/redis";
import { buildAdversarialPrompt } from "./prompts";
import {
  getAnalysisResultCacheKey,
  publishAnalysisEvent,
  registerAnalysisJobHandler
} from "./analysis.queue";
import { serializeAnalysis } from "./analysis.service";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildDemoAnalysisResult = (input: string) =>
  AnalysisResultSchema.parse({
    summary: `The plan has promise, but it relies on assumptions about demand, trust, and execution that still need proof. Demo mode generated this report from your submitted text: "${input.slice(0, 140)}${input.length > 140 ? "..." : ""}"`,
    counterarguments: [
      {
        title: "Demand is asserted more than demonstrated",
        argument: "The proposal sounds confident about the problem, but it does not yet show repeated pain, urgency, or budget ownership strongly enough to justify the confidence level.",
        refutationEvidence: ["Customer calls with clear buying intent", "Evidence of repeated usage", "Replacement of an existing workflow or spend"]
      },
      {
        title: "Distribution may be the actual bottleneck",
        argument: "The current reasoning puts more emphasis on product quality than on how users will actually discover, trust, and adopt the product at scale.",
        refutationEvidence: ["Repeatable acquisition channel", "CAC payback clarity", "Non-founder-led pipeline"]
      },
      {
        title: "Execution dependencies are compressed",
        argument: "Product, trust, monetization, and retention are treated as if they will progress together, but each one can invalidate the others if it slips.",
        refutationEvidence: ["Milestones with owners", "Dependencies mapped explicitly", "Operating buffer for delays"]
      }
    ],
    assumptions: [
      {
        assumption: "Users will trust the system quickly",
        whyItMightBeWrong: "High-stakes users usually need proof, repeatability, and explainability before relying on a contrarian tool.",
        severity: "High",
        validationEvidence: ["Second-session usage", "Trust rating after first report"]
      },
      {
        assumption: "The use case is frequent enough for recurring revenue",
        whyItMightBeWrong: "Decision-support tools can be valuable but episodic, which makes subscription fit weaker than expected.",
        severity: "Critical",
        validationEvidence: ["Weekly active usage", "Cohort frequency data"]
      },
      {
        assumption: "The positioning is clearly differentiated",
        whyItMightBeWrong: "If the output feels generic, buyers will compare it to broader AI tools rather than a must-have workflow.",
        severity: "High",
        validationEvidence: ["Preference tests", "Win-loss feedback"]
      },
      {
        assumption: "Users will share sensitive material",
        whyItMightBeWrong: "Security and confidentiality concerns can block adoption even when the product value is clear.",
        severity: "Critical",
        validationEvidence: ["Security review outcomes", "Submission rate for sensitive use cases"]
      },
      {
        assumption: "First-run delight will translate into retention",
        whyItMightBeWrong: "Novelty can create a strong first impression without producing a recurring habit.",
        severity: "Medium",
        validationEvidence: ["30-day retention", "Repeat activation rates"]
      }
    ],
    expertPersonas: [
      {
        name: "Avery Chen",
        title: "Enterprise Product Leader",
        background: "Builds trust-sensitive workflow software for regulated teams.",
        coreObjection: "The core insight is appealing, but the trust layer still needs more operational proof.",
        unansweredQuestion: "How will you show that the critique is reliably useful instead of just compelling-sounding?",
        seenFailInSimilarSituations: "Has seen promising AI copilots stall when trust and explainability lagged the product story."
      },
      {
        name: "Samir Gupta",
        title: "B2B Growth Advisor",
        background: "Helps early software products build repeatable acquisition before scale.",
        coreObjection: "The product thesis feels sharper than the go-to-market thesis.",
        unansweredQuestion: "Which channel acquires users predictably without depending on founder energy?",
        seenFailInSimilarSituations: "Has seen good products plateau because distribution never became systematic."
      },
      {
        name: "Nora Alvarez",
        title: "AI Evaluation Lead",
        background: "Designs evaluation systems for production AI products.",
        coreObjection: "The system still needs a clearer way to measure whether surfaced blind spots are actually predictive.",
        unansweredQuestion: "What metric separates a useful critique from a persuasive false positive?",
        seenFailInSimilarSituations: "Has seen critique tools lose trust when tone improved faster than signal quality."
      }
    ],
    blindSpotReport: [
      {
        title: "Confidence is ahead of validation",
        severityScore: 9,
        severity: "Critical",
        explanation: "The idea is directionally plausible, but the strongest claims still need direct evidence."
      },
      {
        title: "Distribution is under-modeled",
        severityScore: 8,
        severity: "Critical",
        explanation: "Acquisition assumptions are still too vague relative to the certainty of the plan."
      },
      {
        title: "Trust friction could slow adoption",
        severityScore: 6,
        severity: "High",
        explanation: "The product depends on users sharing valuable inputs they may hesitate to expose."
      },
      {
        title: "Success metrics need sharper definition",
        severityScore: 4,
        severity: "Medium",
        explanation: "The system should prove that its critiques improve outcomes rather than only sounding incisive."
      }
    ],
    confidenceAudit: {
      defensiblePercentage: 46,
      wishfulThinkingPercentage: 54,
      defensibleJustification: "There is a credible underlying problem, but several critical assumptions still need validation.",
      wishfulThinkingExamples: ["Assuming retention before measuring repeat behavior", "Assuming trust without an explicit trust layer"],
      verdict: "Proceed with caution"
    }
  });

export const processAnalysisJob = async (fastify: any, analysisId: string) => {
  const startedAt = Date.now();

  await fastify.prisma.analysis.update({
    where: { id: analysisId },
    data: { status: "PROCESSING" }
  });

  await publishAnalysisEvent(analysisId, {
    event: "processing",
    analysisId,
    status: "PROCESSING",
    message: env.DEMO_MODE ? "Running local demo analysis" : "Adversarial analysis in progress"
  });

  const analysis = await fastify.prisma.analysis.findUniqueOrThrow({
    where: { id: analysisId }
  });

  try {
    if (env.DEMO_MODE) {
      await wait(900);
    }

    const result = env.DEMO_MODE
      ? {
          parsed: buildDemoAnalysisResult(analysis.input),
          usage: {
            input_tokens: Math.ceil(analysis.input.length / 4),
            output_tokens: 1200
          }
        }
      : await (async () => {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 3500,
            temperature: 0.4,
            messages: [
              {
                role: "user",
                content: buildAdversarialPrompt(analysis.input)
              }
            ]
          });

          const text = response.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");

          return {
            parsed: AnalysisResultSchema.parse(JSON.parse(text)),
            usage: response.usage
          };
        })();

    const durationMs = Date.now() - startedAt;

    const updated = await fastify.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "COMPLETE",
        summary: result.parsed.summary,
        counterarguments: result.parsed.counterarguments,
        assumptions: result.parsed.assumptions,
        expertPersonas: result.parsed.expertPersonas,
        blindSpotReport: result.parsed.blindSpotReport,
        confidenceAudit: result.parsed.confidenceAudit,
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
        durationMs
      }
    });

    const completedCount = await fastify.prisma.analysis.count({
      where: {
        userId: analysis.userId,
        status: "COMPLETE"
      }
    });

    await fastify.prisma.user.update({
      where: { id: analysis.userId },
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
      result: serialized.result
    });

    return result.parsed;
  } catch (error) {
    await fastify.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "FAILED",
        durationMs: Date.now() - startedAt
      }
    });

    await publishAnalysisEvent(analysisId, {
      event: "failed",
      analysisId,
      status: "FAILED",
      message: "Analysis failed"
    });

    throw error;
  }
};

export const startAnalysisWorker = (fastify: any) => {
  if (env.ANALYSIS_EXECUTION_MODE === "inline") {
    return null;
  }

  if (env.DEMO_MODE) {
    registerAnalysisJobHandler(async (analysisId) => {
      await processAnalysisJob(fastify, analysisId);
    });

    return null;
  }

  const worker = new Worker(
    ANALYSIS_QUEUE_NAME,
    async (job) => processAnalysisJob(fastify, job.data.analysisId as string),
    {
      connection: createRedisConnection() as any,
      concurrency: 4
    }
  );

  fastify.addHook("onClose", async () => {
    await worker.close();
  });

  return worker;
};
