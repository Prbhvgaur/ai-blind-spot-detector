import type { PrismaClient } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";

import type { Plan } from "@blindspot/shared";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyAccessToken: (token: string) => Promise<AuthUser>;
    applyRateLimit: (
      request: FastifyRequest,
      reply: FastifyReply,
      options?: RateLimitOverride
    ) => Promise<void>;
  }
  interface FastifyRequest {
    rawBody?: string | Buffer;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  plan: Plan;
}

export interface RateLimitOverride {
  bucket?: string;
  limit?: number;
  windowSeconds?: number;
}
