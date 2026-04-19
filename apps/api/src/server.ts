import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import fastifyRawBody from "fastify-raw-body";
import * as Sentry from "@sentry/node";

import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { analysisRoutes } from "./modules/analysis/analysis.routes";
import { startAnalysisWorker } from "./modules/analysis/analysis.worker";
import { authRoutes } from "./modules/auth/auth.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { usersRoutes } from "./modules/users/users.routes";
import authPlugin from "./plugins/auth";
import corsPlugin from "./plugins/cors";
import prismaPlugin from "./plugins/prisma";
import rateLimitPlugin from "./plugins/rateLimit";
import swaggerPlugin from "./plugins/swagger";

export const buildServer = () => {
  if (env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN
    });
  }

  const app = Fastify({
    logger
  });

  app.register(sensible);
  app.register(fastifyCookie);
  app.register(fastifyHelmet);
  app.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true
  });
  app.register(prismaPlugin);
  app.register(corsPlugin);
  app.register(swaggerPlugin);
  app.register(authPlugin);
  app.register(rateLimitPlugin);

  app.setErrorHandler(errorHandler as any);

  app.get("/", async () => ({
    name: "AI Blind Spot Detector API",
    status: "ok",
    mode: env.DEMO_MODE ? "demo" : "full",
    docsUrl: "/docs",
    healthUrl: "/health"
  }));

  app.get("/health", async () => ({
    status: "ok",
    mode: env.DEMO_MODE ? "demo" : "full"
  }));

  app.register(authRoutes);
  app.register(analysisRoutes);
  app.register(usersRoutes);
  app.register(billingRoutes);

  if (
    env.ENABLE_ANALYSIS_WORKER &&
    env.ANALYSIS_EXECUTION_MODE === "queue" &&
    env.NODE_ENV !== "test"
  ) {
    startAnalysisWorker(app);
  }

  return app;
};

let appInstance: ReturnType<typeof buildServer> | null = null;

export const getServer = () => {
  if (!appInstance) {
    appInstance = buildServer();
  }

  return appInstance;
};

export const app = getServer();

export default async function handler(request: any, response: any) {
  const server = getServer();
  await server.ready();
  server.server.emit("request", request, response);
}

const start = async () => {
  try {
    await getServer().listen({
      host: "0.0.0.0",
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const isEntrypoint =
  !module.parent ||
  require.main === module ||
  process.argv[1]?.endsWith("server.ts") ||
  process.argv[1]?.endsWith("server.js");

if (isEntrypoint) {
  void start();
}
