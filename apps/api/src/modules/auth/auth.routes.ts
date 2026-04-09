import { REFRESH_COOKIE_NAME } from "../../config/constants";
import { requireAuth } from "../../middleware/requireAuth";
import { buildUserProfile } from "../users/users.service";
import {
  authResponseSchema,
  googleOAuthBodySchema,
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema
} from "./auth.schema";
import {
  authenticateGoogleUser,
  clearRefreshCookie,
  loginUser,
  refreshSession,
  registerUser,
  revokeRefreshToken,
  setRefreshCookie
} from "./auth.service";

export async function authRoutes(fastify: any) {
  const app = fastify as any;

  app.post(
    "/api/auth/register",
    {
      schema: {
        tags: ["auth"],
        body: registerBodySchema,
        response: { 201: authResponseSchema }
      },
      preHandler: async (request: any, reply: any) => app.applyRateLimit(request, reply)
    },
    async (request: any, reply: any) => {
      const payload = await registerUser(app, request.body);
      setRefreshCookie(reply, payload.refreshToken);
      reply.code(201).send(payload);
    }
  );

  app.post(
    "/api/auth/login",
    {
      schema: {
        tags: ["auth"],
        body: loginBodySchema,
        response: { 200: authResponseSchema }
      },
      preHandler: async (request: any, reply: any) => app.applyRateLimit(request, reply)
    },
    async (request: any, reply: any) => {
      const payload = await loginUser(app, request.body);
      setRefreshCookie(reply, payload.refreshToken);
      reply.send(payload);
    }
  );

  app.post(
    "/api/auth/oauth/google",
    {
      schema: {
        tags: ["auth"],
        body: googleOAuthBodySchema,
        response: { 200: authResponseSchema }
      },
      preHandler: async (request: any, reply: any) => app.applyRateLimit(request, reply)
    },
    async (request: any, reply: any) => {
      const payload = await authenticateGoogleUser(app, request.body);
      setRefreshCookie(reply, payload.refreshToken);
      reply.send(payload);
    }
  );

  app.post(
    "/api/auth/refresh",
    {
      schema: {
        tags: ["auth"],
        body: refreshBodySchema,
        response: { 200: authResponseSchema }
      },
      preHandler: async (request: any, reply: any) => app.applyRateLimit(request, reply)
    },
    async (request: any, reply: any) => {
      const token = request.body.refreshToken ?? request.cookies[REFRESH_COOKIE_NAME];

      if (!token) {
        reply.code(401).send({ message: "Refresh token required" });
        return;
      }

      const payload = await refreshSession(app, token);
      setRefreshCookie(reply, payload.refreshToken);
      reply.send(payload);
    }
  );

  app.post(
    "/api/auth/logout",
    {
      preHandler: async (request: any, reply: any) => app.applyRateLimit(request, reply)
    },
    async (request: any, reply: any) => {
      await revokeRefreshToken(app, request.cookies[REFRESH_COOKIE_NAME]);
      clearRefreshCookie(reply);
      reply.send({ success: true });
    }
  );

  app.get(
    "/api/auth/me",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => app.applyRateLimit(request, reply)
      ]
    },
    async (request: any) => buildUserProfile(app.prisma, request.user!.id)
  );
}
