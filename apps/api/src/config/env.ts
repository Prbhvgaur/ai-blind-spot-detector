import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

const envFiles = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../../.env")
];

for (const envFile of envFiles) {
  dotenv.config({ path: envFile, override: false });
}

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const hasRealAnthropicKey = (value?: string) => Boolean(value?.startsWith("sk-ant-"));
const hasStripeSecretKey = (value?: string) =>
  Boolean(value?.startsWith("sk_") && !value.toLowerCase().includes("demo"));
const hasStripeWebhookSecret = (value?: string) =>
  Boolean(value?.startsWith("whsec_") && !value.toLowerCase().includes("demo"));
const hasStripePriceId = (value?: string) =>
  Boolean(value?.startsWith("price_") && !value.toLowerCase().includes("demo"));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3101),
  DATABASE_URL: optionalString,
  REDIS_URL: optionalUrl,
  JWT_SECRET: z.string().min(32).default("demo-jwt-secret-demo-jwt-secret-demo-jwt-secret-1234"),
  JWT_REFRESH_SECRET: z.string().min(32).default("demo-refresh-secret-demo-refresh-secret-demo-12345"),
  ANTHROPIC_API_KEY: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRO_PRICE_ID: optionalString,
  SENTRY_DSN: optionalUrl,
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? process.env.NODE_ENV !== "test" : value !== "false")),
  ANALYSIS_EXECUTION_MODE: z.enum(["queue", "inline"]).default("queue"),
  ENABLE_ANALYSIS_WORKER: z
    .string()
    .optional()
    .transform((value) => value !== "false")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration", parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

const missingFields = [
  !parsedEnv.data.DATABASE_URL ? "DATABASE_URL" : null,
  !parsedEnv.data.REDIS_URL ? "REDIS_URL" : null,
  !parsedEnv.data.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY" : null,
  !parsedEnv.data.STRIPE_SECRET_KEY ? "STRIPE_SECRET_KEY" : null,
  !parsedEnv.data.STRIPE_WEBHOOK_SECRET ? "STRIPE_WEBHOOK_SECRET" : null,
  !parsedEnv.data.STRIPE_PRO_PRICE_ID ? "STRIPE_PRO_PRICE_ID" : null
].filter((value): value is string => Boolean(value));

if (!parsedEnv.data.DEMO_MODE && missingFields.length > 0) {
  console.error("Invalid environment configuration", {
    missing: missingFields
  });
  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  DATABASE_URL: parsedEnv.data.DATABASE_URL ?? "demo://blindspot",
  REDIS_URL: parsedEnv.data.REDIS_URL ?? "redis://localhost:6379",
  ANTHROPIC_API_KEY: parsedEnv.data.ANTHROPIC_API_KEY ?? "demo-anthropic-key",
  GOOGLE_CLIENT_ID: parsedEnv.data.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: parsedEnv.data.GOOGLE_CLIENT_SECRET,
  STRIPE_SECRET_KEY: parsedEnv.data.STRIPE_SECRET_KEY ?? "sk_test_demo",
  STRIPE_WEBHOOK_SECRET: parsedEnv.data.STRIPE_WEBHOOK_SECRET ?? "whsec_demo",
  STRIPE_PRO_PRICE_ID: parsedEnv.data.STRIPE_PRO_PRICE_ID ?? "price_demo",
  ANTHROPIC_ENABLED: hasRealAnthropicKey(parsedEnv.data.ANTHROPIC_API_KEY),
  GOOGLE_OAUTH_ENABLED: Boolean(parsedEnv.data.GOOGLE_CLIENT_ID && parsedEnv.data.GOOGLE_CLIENT_SECRET),
  STRIPE_ENABLED:
    hasStripeSecretKey(parsedEnv.data.STRIPE_SECRET_KEY) &&
    hasStripeWebhookSecret(parsedEnv.data.STRIPE_WEBHOOK_SECRET) &&
    hasStripePriceId(parsedEnv.data.STRIPE_PRO_PRICE_ID)
};
