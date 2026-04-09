import { env } from "../../config/env";
import { createRedisConnection } from "../../lib/redis";
import { requireAuth } from "../../middleware/requireAuth";
import {
  analysisIdParamsSchema,
  analysisResponseSchema,
  createAnalysisBodySchema,
  enqueueAnalysisResponseSchema,
  getAnalysisQuerySchema,
  listAnalysesQuerySchema,
  paginatedAnalysisResponseSchema,
  streamAnalysisQuerySchema,
  toggleShareBodySchema
} from "./analysis.schema";
import { analysisQueue, publishAnalysisEvent } from "./analysis.queue";
import { processAnalysisJob } from "./analysis.worker";
import {
  assertAnalysisQuota,
  createAnalysisRecord,
  getAnalysisForViewer,
  listAnalysesForUser,
  softDeleteAnalysis,
  toggleAnalysisShare
} from "./analysis.service";

const writeSse = (raw: NodeJS.WritableStream, event: string, data: unknown) => {
  raw.write(`event: ${event}\n`);
  raw.write(`data: ${JSON.stringify(data)}\n\n`);
};

export async function analysisRoutes(fastify: any) {
  fastify.post(
    "/api/analyses",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => fastify.applyRateLimit(request, reply, { bucket: "analysis:create" })
      ],
      schema: {
        tags: ["analysis"],
        body: createAnalysisBodySchema,
        response: {
          202: enqueueAnalysisResponseSchema
        }
      }
    },
    async (request: any, reply: any) => {
      const user = await fastify.prisma.user.findUniqueOrThrow({
        where: { id: request.user!.id }
      });

      try {
        await assertAnalysisQuota(fastify.prisma, user);
      } catch {
        reply.code(403).send({ message: "Free analysis limit reached. Upgrade to Pro for unlimited analyses." });
        return;
      }

      const analysis = await createAnalysisRecord(fastify.prisma, request.user!.id, request.body.input);
      await publishAnalysisEvent(analysis.id, {
        event: "queued",
        analysisId: analysis.id,
        status: "PENDING",
        message: "Analysis queued"
      });

      if (!env.DEMO_MODE && env.ANALYSIS_EXECUTION_MODE === "inline") {
        await processAnalysisJob(fastify, analysis.id);
      } else {
        await analysisQueue.add(
          "analysis",
          { analysisId: analysis.id },
          { jobId: analysis.id }
        );
      }

      reply.code(202).send({
        analysisId: analysis.id,
        status: 202
      });
    }
  );

  fastify.get(
    "/api/analyses/:id",
    {
      preHandler: async (request: any, reply: any) => {
        await fastify.optionalAuthenticate(request, reply);
        await fastify.applyRateLimit(request, reply);
      },
      schema: {
        tags: ["analysis"],
        params: analysisIdParamsSchema,
        querystring: getAnalysisQuerySchema,
        response: {
          200: analysisResponseSchema
        }
      }
    },
    async (request: any, reply: any) => {
      const analysis = await getAnalysisForViewer(
        fastify.prisma,
        request.params.id,
        request.user?.id,
        request.query.shareToken
      );

      if (!analysis) {
        reply.code(404).send({ message: "Analysis not found" });
        return;
      }

      reply.send(analysis);
    }
  );

  fastify.get(
    "/api/analyses/:id/stream",
    {
      preHandler: async (request: any, reply: any) => {
        await fastify.optionalAuthenticate(request, reply);
        await fastify.applyRateLimit(request, reply, { bucket: "analysis:stream" });
      },
      schema: {
        tags: ["analysis"],
        params: analysisIdParamsSchema,
        querystring: streamAnalysisQuerySchema
      }
    },
    async (request: any, reply: any) => {
      let viewerId = request.user?.id;

      if (!viewerId && request.query.accessToken) {
        const user = await fastify.verifyAccessToken(request.query.accessToken);
        viewerId = user.id;
      }

      if (!viewerId) {
        reply.code(401).send({ message: "Authentication required" });
        return;
      }

      const analysis = await fastify.prisma.analysis.findUnique({
        where: { id: request.params.id }
      });

      if (!analysis || analysis.userId !== viewerId) {
        reply.code(404).send({ message: "Analysis not found" });
        return;
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      });

      writeSse(reply.raw, analysis.status === "PENDING" ? "queued" : analysis.status === "PROCESSING" ? "processing" : analysis.status === "COMPLETE" ? "complete" : "failed", {
        analysisId: analysis.id,
        status: analysis.status,
        message:
          analysis.status === "PENDING"
            ? "Analysis queued"
            : analysis.status === "PROCESSING"
              ? "Adversarial analysis in progress"
              : analysis.status === "COMPLETE"
                ? "Analysis complete"
                : "Analysis failed"
      });

      if (analysis.status === "COMPLETE" || analysis.status === "FAILED") {
        reply.raw.end();
        return;
      }

      const subscriber = createRedisConnection();
      const channel = `analysis-events:${analysis.id}`;
      const heartbeat = setInterval(() => {
        reply.raw.write(": ping\n\n");
      }, 15000);

      await subscriber.subscribe(channel);
      subscriber.on("message", (_channel, payload) => {
        const data = JSON.parse(payload);
        writeSse(reply.raw, data.event, data);

        if (data.event === "complete" || data.event === "failed") {
          clearInterval(heartbeat);
          subscriber.disconnect();
          reply.raw.end();
        }
      });

      request.raw.on("close", () => {
        clearInterval(heartbeat);
        subscriber.disconnect();
      });
    }
  );

  fastify.get(
    "/api/analyses",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => fastify.applyRateLimit(request, reply)
      ],
      schema: {
        tags: ["analysis"],
        querystring: listAnalysesQuerySchema,
        response: {
          200: paginatedAnalysisResponseSchema
        }
      }
    },
    async (request: any) =>
      listAnalysesForUser(fastify.prisma, request.user!.id, request.query.page, request.query.limit)
  );

  fastify.patch(
    "/api/analyses/:id/share",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => fastify.applyRateLimit(request, reply)
      ],
      schema: {
        tags: ["analysis"],
        params: analysisIdParamsSchema,
        body: toggleShareBodySchema,
        response: {
          200: analysisResponseSchema
        }
      }
    },
    async (request: any) =>
      toggleAnalysisShare(fastify.prisma, request.params.id, request.user!.id, request.body.isPublic)
  );

  fastify.delete(
    "/api/analyses/:id",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => fastify.applyRateLimit(request, reply)
      ],
      schema: {
        tags: ["analysis"],
        params: analysisIdParamsSchema,
        response: {
          200: analysisResponseSchema
        }
      }
    },
    async (request: any) => softDeleteAnalysis(fastify.prisma, request.params.id, request.user!.id)
  );
}
