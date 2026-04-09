import { z } from "zod";

import { env } from "../../config/env";
import { requireAuth } from "../../middleware/requireAuth";
import { createCheckoutSession, createPortalSession } from "./billing.service";
import { stripeWebhooksRoute } from "./stripe.webhooks";

const billingUrlSchema = z.object({
  url: z.string().url()
});

export async function billingRoutes(fastify: any) {
  const app = fastify as any;

  app.post(
    "/api/billing/checkout-session",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => app.applyRateLimit(request, reply)
      ],
      schema: {
        tags: ["billing"],
        response: { 200: billingUrlSchema }
      }
    },
    async (request: any) =>
      createCheckoutSession(app.prisma, request.user!.id, env.NEXTAUTH_URL, env.STRIPE_PRO_PRICE_ID)
  );

  app.post(
    "/api/billing/portal-session",
    {
      preHandler: [
        requireAuth,
        async (request: any, reply: any) => app.applyRateLimit(request, reply)
      ],
      schema: {
        tags: ["billing"],
        response: { 200: billingUrlSchema }
      }
    },
    async (request: any) => createPortalSession(app.prisma, request.user!.id, env.NEXTAUTH_URL)
  );

  await stripeWebhooksRoute(app);
}
