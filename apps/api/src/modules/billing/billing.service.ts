import { env } from "../../config/env";
import { stripe } from "../../lib/stripe";

export const ensureStripeCustomer = async (prisma: any, user: any) => {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: {
      userId: user.id
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id }
  });

  return customer.id;
};

export const createCheckoutSession = async (prisma: any, userId: string, origin: string, priceId: string) => {
  if (env.DEMO_MODE || !env.STRIPE_ENABLED) {
    return {
      url: `${origin}/dashboard/settings?billing=${env.DEMO_MODE ? "demo-checkout" : "stripe-unavailable"}&user=${encodeURIComponent(userId)}`
    };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId }
  });

  const customerId = await ensureStripeCustomer(prisma, user);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${origin}/dashboard/settings?billing=success`,
    cancel_url: `${origin}/pricing?billing=cancelled`,
    metadata: {
      userId
    }
  });

  return {
    url: session.url
  };
};

export const createPortalSession = async (prisma: any, userId: string, origin: string) => {
  if (env.DEMO_MODE || !env.STRIPE_ENABLED) {
    return {
      url: `${origin}/dashboard/settings?billing=${env.DEMO_MODE ? "demo-portal" : "stripe-unavailable"}&user=${encodeURIComponent(userId)}`
    };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId }
  });

  const customerId = await ensureStripeCustomer(prisma, user);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard/settings`
  });

  return {
    url: session.url
  };
};
