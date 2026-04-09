import { Queue } from "bullmq";

import { ANALYSIS_QUEUE_NAME } from "../../config/constants";
import { env } from "../../config/env";
import { createRedisConnection, redis } from "../../lib/redis";

type AnalysisJobHandler = (analysisId: string) => Promise<void>;

let demoJobHandler: AnalysisJobHandler | null = null;

export const registerAnalysisJobHandler = (handler: AnalysisJobHandler) => {
  demoJobHandler = handler;
};

export const analysisQueue = env.DEMO_MODE
  ? {
      add: async (_name: string, payload: { analysisId: string }, _options?: unknown) => {
        setTimeout(() => {
          void demoJobHandler?.(payload.analysisId).catch((error) => {
            console.error("Demo analysis job failed", error);
          });
        }, 150);

        return {
          id: payload.analysisId
        };
      }
    }
  : new Queue(ANALYSIS_QUEUE_NAME, {
      connection: createRedisConnection() as any,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 100,
        backoff: {
          type: "exponential",
          delay: 2000
        }
      }
    });

export const getAnalysisEventChannel = (analysisId: string) => `analysis-events:${analysisId}`;
export const getAnalysisResultCacheKey = (analysisId: string) => `analysis-result:${analysisId}`;

export const publishAnalysisEvent = async (
  analysisId: string,
  payload: Record<string, unknown>
) => {
  await redis.publish(getAnalysisEventChannel(analysisId), JSON.stringify(payload));
};
