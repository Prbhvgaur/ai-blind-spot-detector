# AI Blind Spot Detector

AI Blind Spot Detector is a production-oriented monorepo for adversarial AI analysis. Users submit any idea, plan, decision, or AI conversation and receive a ranked blind spot report, hidden assumptions, expert disagreements, steelmanned counterarguments, and a confidence audit.

## Stack

- Backend: Node.js 20, Fastify 4, TypeScript, Prisma, PostgreSQL 15, Redis 7, BullMQ, Anthropic, Stripe, Pino, Vitest
- Frontend: Next.js 14 App Router, Tailwind CSS 3.4, Zustand, TanStack Query, React Hook Form, Framer Motion, next-auth v5
- Infra: Docker Compose, Vercel, GitHub Actions, Sentry, Neon Postgres, Upstash Redis

## Prerequisites

- Node.js 20 LTS
- Docker Desktop (optional, for local Postgres + Redis)
- GitHub account
- Vercel account
- Stripe account
- Anthropic API key
- Google Cloud OAuth credentials (for Google sign-in)

## Local Development

This repository supports two local modes:

- Demo mode: no external infrastructure required, good for trying the app quickly
- Full mode: uses real Postgres, Redis, Anthropic, Stripe, and optional Google OAuth

### Demo Mode

1. Clone the repository:

```bash
git clone <your-repo-url>
cd blind-spot-detector
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Start everything:

```bash
npm install
npm run dev
```

The checked-in local demo setup runs the frontend on `http://localhost:3000`, the API on `http://localhost:3101`, Swagger on `http://localhost:3101/docs`, and the health endpoint on `http://localhost:3101/health`.

### Full Local Mode

1. Copy `.env.example` to `.env`.
2. Set `DEMO_MODE=false`.
3. Set `ANALYSIS_EXECUTION_MODE=queue` for a worker-backed setup, or `ANALYSIS_EXECUTION_MODE=inline` if you want the API process to handle analyses directly.
4. Supply real values for:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `ANTHROPIC_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRO_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
5. Start Postgres and Redis locally:

```bash
docker-compose up --build postgres redis
```

6. Push the schema and start the apps:

```bash
npm run db:generate
npm run db:push
npm run dev
```

### Google OAuth Setup

Create a Google OAuth web application and add these redirect settings:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

For production, add the Vercel web domain as both an origin and redirect URI.

## Repository Bootstrap

```bash
git init
git remote add origin <url>
git add .
git commit -m "feat: bootstrap blind spot detector"
git push -u origin main
```

## Vercel Deployment

Create two Vercel projects from the same Git repository:

- Web project root directory: `apps/web`
- API project root directory: `apps/api`

Set these API project environment variables:

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `DEMO_MODE=false`
- `ANALYSIS_EXECUTION_MODE=inline`
- `ENABLE_ANALYSIS_WORKER=false`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_API_URL`
- `SENTRY_DSN`

Set these web project environment variables:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`

The API can run on Vercel as a Fastify function. For the Vercel-hosted API, `ANALYSIS_EXECUTION_MODE=inline` is recommended so analysis jobs complete inside the request lifecycle instead of relying on a persistent background worker.

## GitHub Actions Secrets

Configure these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SENTRY_AUTH_TOKEN`

## Stripe Webhook Setup

1. In Stripe, create a recurring monthly Price for the Pro plan.
2. Copy the Price ID into `STRIPE_PRO_PRICE_ID`.
3. Add a webhook endpoint pointing to `https://<your-api-domain>/api/billing/webhooks`.
4. Subscribe the webhook to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Architecture

```text
┌──────────────┐      HTTPS       ┌──────────────┐
│   Browser    │ ───────────────► │ Next.js Web  │
└──────┬───────┘                  └──────┬───────┘
       │                                  │
       │ REST / SSE / Auth                │ Server session
       ▼                                  ▼
┌──────────────┐      Redis Queue   ┌──────────────┐
│ Fastify API  │ ─────────────────► │ BullMQ Jobs  │
└──────┬───────┘                    └──────┬───────┘
       │                                  │
       │ Prisma                            │ Anthropic
       ▼                                  ▼
┌──────────────┐                    ┌──────────────┐
│ PostgreSQL   │                    │ Claude API   │
└──────────────┘                    └──────────────┘
       │
       ▼
┌──────────────┐
│   Stripe     │
└──────────────┘
```

## Production Checklist

- Copy `.env.example` to `.env` and fill in all values
- Run `docker-compose up --build postgres redis` and verify local health checks
- Create the GitHub repository and push `main`
- Create separate Vercel projects for `apps/web` and `apps/api`
- Add GitHub Actions secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SENTRY_AUTH_TOKEN`
- Add Google OAuth production redirect URIs for the deployed web domain
- Deploy both Vercel projects from the connected Git repository
- Configure the Stripe webhook endpoint
- Confirm `GET /health` and `GET /docs/json` work in production
- Enable Sentry by supplying `SENTRY_DSN` and `SENTRY_AUTH_TOKEN`
