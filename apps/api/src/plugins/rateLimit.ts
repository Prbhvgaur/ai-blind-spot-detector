import fp from "fastify-plugin";

import { USER_PLAN_CACHE_TTL_SECONDS } from "../config/constants";
import { redis } from "../lib/redis";
import type { RateLimitOverride } from "../types";

const defaultWindowSeconds = 15 * 60;

const resolvePlan = async (userId: string, fallbackPlan: "FREE" | "PRO") => {
  const cacheKey = `user-plan:${userId}`;
  const cached = await redis.get(cacheKey);

  if (cached === "FREE" || cached === "PRO") {
    return cached;
  }

  await redis.set(cacheKey, fallbackPlan, "EX", USER_PLAN_CACHE_TTL_SECONDS);
  return fallbackPlan;
};

export default fp(async (fastify) => {
  fastify.decorate(
    "applyRateLimit",
    async (request, reply, options: RateLimitOverride = {}) => {
      const identifier = request.user?.id ?? request.ip;
      const bucket = options.bucket ?? "default";

      let limit = options.limit;
      let windowSeconds = options.windowSeconds ?? defaultWindowSeconds;

      if (!limit) {
        if (!request.user) {
          limit = 20;
        } else {
          const plan = await resolvePlan(request.user.id, request.user.plan);
          limit = plan === "PRO" ? 200 : 50;
        }
      }

      if (bucket === "analysis:create" && request.user) {
        const plan = await resolvePlan(request.user.id, request.user.plan);
        limit = plan === "PRO" ? 60 : 5;
        windowSeconds = 60 * 60;
      }

      const key = `rate-limit:${bucket}:${identifier}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      reply.header("X-RateLimit-Limit", String(limit));
      reply.header("X-RateLimit-Remaining", String(Math.max(limit - current, 0)));

      if (current > limit) {
        reply.header("Retry-After", String(Math.max(ttl, 1)));
        reply.code(429).send({ message: "Rate limit exceeded" });
      }
    }
  );
});
