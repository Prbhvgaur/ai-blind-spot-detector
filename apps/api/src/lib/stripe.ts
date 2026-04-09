import Stripe from "stripe";

import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var __blindspotStripe__: any;
}

export const stripe =
  global.__blindspotStripe__ ??
  new (Stripe as any)(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover"
  });

if (env.NODE_ENV !== "production") {
  global.__blindspotStripe__ = stripe;
}
