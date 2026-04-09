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

const liveRedis = env.DEMO_MODE ? undefined : global.__blindspotRedis__ ?? createRedisClient();

export const redis: Redis | DemoRedisLike = env.DEMO_MODE
  ? demoRedis
  : liveRedis!;

if (env.NODE_ENV !== "production" && !env.DEMO_MODE) {
  global.__blindspotRedis__ = liveRedis!;
}

export const createRedisConnection = () =>
  (env.DEMO_MODE ? demoRedis.createSubscriber() : createRedisClient()) as Redis | DemoRedisSubscriberLike;
