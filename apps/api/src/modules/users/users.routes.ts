import { requireAuth } from "../../middleware/requireAuth";
import {
  updateUserBodySchema,
  userHistoryResponseSchema,
  userProfileResponseSchema
} from "./users.schema";
import { buildUserProfile, updateUserName } from "./users.service";

export async function usersRoutes(fastify: any) {
  const app = fastify as any;

  app.get(
    "/api/users/me",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => app.applyRateLimit(request, reply)
      ],
      schema: {
        tags: ["users"],
        response: {
          200: userProfileResponseSchema
        }
      }
    },
    async (request: any) => buildUserProfile(app.prisma, request.user!.id)
  );

  app.patch(
    "/api/users/me",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => app.applyRateLimit(request, reply)
      ],
      schema: {
        tags: ["users"],
        body: updateUserBodySchema,
        response: {
          200: userProfileResponseSchema
        }
      }
    },
    async (request: any) => updateUserName(app.prisma, request.user!.id, request.body.name)
  );

  app.get(
    "/api/users/me/history",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => app.applyRateLimit(request, reply)
      ],
      schema: {
        tags: ["users"],
        response: {
          200: userHistoryResponseSchema
        }
      }
    },
    async (request: any) => {
      const items = await app.prisma.analysis.findMany({
        where: { userId: request.user!.id },
        orderBy: { createdAt: "desc" },
        take: 20
      });

      return {
        items: items.map((item: any) => ({
          id: item.id,
          status: item.status,
          input: item.input,
          createdAt: item.createdAt.toISOString(),
          isPublic: item.isPublic,
          shareToken: item.shareToken,
          result:
            item.summary && item.counterarguments && item.assumptions && item.expertPersonas && item.blindSpotReport && item.confidenceAudit
              ? {
                  summary: item.summary,
                  counterarguments: item.counterarguments,
                  assumptions: item.assumptions,
                  expertPersonas: item.expertPersonas,
                  blindSpotReport: item.blindSpotReport,
                  confidenceAudit: item.confidenceAudit
                }
              : null
        })),
        pagination: {
          page: 1,
          limit: 20,
          total: items.length,
          totalPages: 1
        }
      };
    }
  );
}
