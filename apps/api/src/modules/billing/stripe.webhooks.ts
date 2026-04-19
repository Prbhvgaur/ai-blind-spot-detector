import { randomUUID } from "node:crypto";

import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { WEBHOOK_IDEMPOTENCY_TTL_SECONDS } from "../../config/constants";
import { env } from "../../config/env";
import { redis } from "../../lib/redis";
import { stripe } from "../../lib/stripe";

const handleSubscriptionSync = async (prisma: any, subscription: any) => {
  const customerId = String(subscription.customer);
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId }
  });

  if (!user) {
    return;
  }

  const commonData = {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionEndsAt: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null
  };

  if (subscription.status === "active" || subscription.status === "trialing") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...commonData,
        plan: "PRO"
      }
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...commonData,
        plan: "FREE"
      }
    });
  }
};

export async function stripeWebhooksRoute(fastify: any) {
  const app = fastify as any;

  app.post(
    "/api/billing/webhooks",
    {
      config: {
        rawBody: true
      },
      schema: {
        tags: ["billing"]
      }
    },
    async (request: any, reply: any) => {
      if (env.DEMO_MODE || !env.STRIPE_ENABLED) {
        reply.code(202).send({
          received: true,
          mode: env.DEMO_MODE ? "demo" : "disabled"
        });
        return;
      }

      const signature = request.headers["stripe-signature"];

      if (!signature || !request.rawBody) {
        reply.code(400).send({ message: "Missing Stripe signature" });
        return;
      }

      let event;

      try {
        event = stripe.webhooks.constructEvent(request.rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
      } catch {
        reply.code(400).send({ message: "Invalid webhook signature" });
        return;
      }

      const idempotencyKey = `stripe-webhook:${event.id}`;
      const accepted = await redis.setnx(idempotencyKey, randomUUID());
      if (!accepted) {
        reply.send({ received: true, duplicate: true });
        return;
      }
      await redis.expire(idempotencyKey, WEBHOOK_IDEMPOTENCY_TTL_SECONDS);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          const userId = session.metadata?.userId;

          if (userId) {
            await app.prisma.user.update({
              where: { id: userId },
              data: {
                plan: "PRO",
                stripeCustomerId: String(session.customer),
                stripeSubscriptionId: String(session.subscription ?? ""),
                subscriptionStatus: "active"
              }
            });
          }
          break;
        }
        case "customer.subscription.updated": {
          await handleSubscriptionSync(app.prisma, event.data.object);
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;
          const user = await app.prisma.user.findFirst({
            where: { stripeSubscriptionId: subscription.id }
          });

          if (user) {
            await app.prisma.user.update({
              where: { id: user.id },
              data: {
                plan: "FREE",
                subscriptionStatus: "canceled",
                subscriptionEndsAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null
              }
            });
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          const customerId = String(invoice.customer);
          const user = await app.prisma.user.findFirst({
            where: { stripeCustomerId: customerId }
          });

          if (user) {
            await app.prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "past_due"
              }
            });
          }
          break;
        }
        default:
          break;
      }

      reply.send({ received: true });
    }
  );
}
