import { Queue } from "bullmq";
import { env } from "../../config/env";
import { createRedisConnection } from "../../lib/redis";
import { ANALYSIS_QUEUE_NAME } from "../../config/constants";

// Job data structure with priority metadata
export interface AnalysisJobData {
  analysisId: string;
  userId: string;
  userPlan: "FREE" | "PRO";
  createdAt: number;
}

// Priority scoring: PRO users (priority 1-10) vs FREE (priority 20-30)
// Lower = Higher Priority
export const calculateJobPriority = (job: AnalysisJobData): number => {
  if (job.userPlan === "PRO") {
    // PRO: priority 1-5 based on FIFO
    return 1;
  } else {
    // FREE: priority 20-30 (queued after all PRO jobs)
    return 20;
  }
};

export const analysisQueue = env.DEMO_MODE
  ? {
      add: async (
        _name: string,
        payload: AnalysisJobData,
        _options?: unknown
      ) => {
        setTimeout(() => {
          void demoJobHandler?.(payload.analysisId).catch((error) => {
            console.error("Demo analysis job failed", error);
          });
        }, 150);

        return { id: payload.analysisId };
      }
    }
  : new Queue<AnalysisJobData>(ANALYSIS_QUEUE_NAME, {
      connection: createRedisConnection() as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "custom"
          // We'll implement custom backoff in the worker
        },
        removeOnComplete: { age: 3600 }, // Keep for 1 hour
        removeOnFail: false // Keep failed jobs for debugging
      }
    });

type AnalysisJobHandler = (analysisId: string) => Promise<void>;
let demoJobHandler: AnalysisJobHandler | null = null;

export const registerAnalysisJobHandler = (handler: AnalysisJobHandler) => {
  demoJobHandler = handler;
};

export const enqueueAnalysisJob = async (
  analysisId: string,
  userId: string,
  userPlan: "FREE" | "PRO"
) => {
  const jobData: AnalysisJobData = {
    analysisId,
    userId,
    userPlan,
    createdAt: Date.now()
  };

  const priority = calculateJobPriority(jobData);

  return await analysisQueue.add("analysis", jobData, {
    jobId: analysisId,
    priority,
    delay: userPlan === "FREE" ? 2000 : 0 // FREE users wait 2s
  });
};
