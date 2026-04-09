import crypto from "node:crypto";

import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { ACCESS_TOKEN_TTL } from "../config/constants";
import { env } from "../config/env";
import type { AuthUser } from "../types";

export const hashOpaqueToken = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export default fp(async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      algorithm: "HS256",
      expiresIn: ACCESS_TOKEN_TTL
    }
  });

  fastify.decorate("verifyAccessToken", async (token: string) => {
    const payload = await fastify.jwt.verify<{
      id: string;
      email: string;
      plan: "FREE" | "PRO";
    }>(token);

    return {
      id: payload.id,
      email: payload.email,
      plan: payload.plan
    } satisfies AuthUser;
  });

  fastify.decorate("authenticate", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader?.replace(/^Bearer\s+/i, "");

      if (!token) {
        reply.code(401).send({ message: "Authentication required" });
        return;
      }

      request.user = await fastify.verifyAccessToken(token);
    } catch {
      reply.code(401).send({ message: "Invalid or expired token" });
    }
  });

  fastify.decorate("optionalAuthenticate", async (request) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return;
    }

    try {
      request.user = await fastify.verifyAccessToken(token);
    } catch {
      return;
    }
  });
});
