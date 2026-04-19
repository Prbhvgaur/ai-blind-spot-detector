import Redis from "ioredis";

import { env } from "../config/env";
import { type DemoRedisLike, type DemoRedisSubscriberLike, demoRedis } from "../dev/demo-redis";

declare global {
  // eslint-disable-next-line no-var
  var __blindspotRedis__: Redis | undefined;
}

const createRedisClient = () =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });

const useInMemoryRedis = env.DEMO_MODE || env.ANALYSIS_EXECUTION_MODE === "inline";

const liveRedis = useInMemoryRedis ? undefined : global.__blindspotRedis__ ?? createRedisClient();

export const redis: Redis | DemoRedisLike = useInMemoryRedis
  ? demoRedis
  : liveRedis!;

if (env.NODE_ENV !== "production" && !useInMemoryRedis) {
  global.__blindspotRedis__ = liveRedis!;
}

export const createRedisConnection = () =>
  (useInMemoryRedis ? demoRedis.createSubscriber() : createRedisClient()) as
    | Redis
    | DemoRedisSubscriberLike;
