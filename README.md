# Preferred Solutions Transport — Delivery Platform

Modern delivery management built with Next.js, Supabase, and Stripe. From quote request to proof of delivery.

## Status

- **Current**: Milestone 2.5 — Production ready
- **Shipped**:
  - M1: Quote → Payment (pricing, Stripe Checkout, webhook order creation, dispatcher queue)
  - M2: Driver management & actions (assignment, dashboards, status updates)
  - M2.5: Admin & Customer UIs, Google Maps distance, HubSpot config, Vercel-ready
- **Next**:
  - M3: Real-time tracking & notifications (WebSockets)
  - M4: Analytics & reporting

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase project
- Stripe account + Stripe CLI (for local webhooks)
- jq (optional, used by scripts)

### 1) Clone and install
```bash
git clone <your-repo-url>
cd preferredsolutionstransport
cp env.example .env.local
npm install
```

### 2) Configure environment
Set the required variables in `.env.local` (others are optional):
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Webhooks (local/dev): `STRIPE_WEBHOOK_SECRET`
- Google Maps: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (and `GOOGLE_MAPS_API_KEY` if server-side usage)

Optional: HubSpot (`HUBSPOT_PRIVATE_APP_TOKEN` and pipeline IDs), Sentry (`NEXT_PUBLIC_SENTRY_DSN`), feature flags.

### 3) Database
- Open `supabase/consolidated-schema.sql` in Supabase SQL Editor and run it (safe to re-run)
- Optional: update emails and run `supabase/seeds/initial_roles.sql`

### 4) Stripe webhook (local)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the signing secret into STRIPE_WEBHOOK_SECRET in .env.local
```

### 5) Run
```bash
npm run dev
```
Open http://localhost:3000

## Test the app

- Automated smoke test (requires a running dev server):
  ```bash
  bash scripts/smoke.sh
  ```
  Tip: set `BASE_URL` to test a non-local environment.

- Manual end‑to‑end:
  1) Go to `/quote`, submit a request → Continue to Payment
  2) Complete Stripe test checkout (card `4242 4242 4242 4242`)
  3) After payment, visit `/dispatcher` to see the new order (`ReadyForDispatch`)
  4) Assign a driver → visit `/driver` to update statuses

- Optional basic API script:
  ```bash
  bash scripts/test-api.sh
  ```

## What’s inside

- **Key features**: Distance‑based pricing, Stripe checkout, webhook order creation, dispatcher queue, driver assignment & status updates, admin dashboard, customer tracking & dashboard, Google Maps distance, HubSpot sync, full audit trail.
- **Tech stack**: Next.js 14 (App Router) + TypeScript + Tailwind | Supabase (Postgres + RLS) | Stripe Checkout + Webhooks | HubSpot API | Vercel‑ready.
- **Pricing**: Configured in `lib/config.ts` (base, per‑mile, surcharge).
- **Security**: Hardened RLS, server‑side service role usage only, webhook signature verification, input validation with Zod.

## Routes

### App (UI)
- `/` — Homepage
- `/quote` — Request quote & checkout
- `/track/[orderId]` — Track order status
- `/customer/dashboard` — Customer orders
- `/thank-you` — Post‑payment
- `/dispatcher` — Dispatcher dashboard (admin/dispatcher)
- `/driver` — Driver dashboard (driver)
- `/admin` — Admin dashboard (admin)
- `/auth/sign-in` — Sign in

### API
- `POST /api/quote` — Create quote (applies pricing)
- `POST /api/checkout` — Create Stripe Checkout session
- `POST /api/stripe/webhook` — Verify and process Stripe events → create order
- `GET/POST /api/drivers` — Manage drivers
- `POST /api/orders/assign` — Assign driver
- `PATCH /api/orders/:orderId/status` — Update order status
- `POST /api/orders/by-driver` — Get driver’s orders

## Docs
- [Deployment Guide](./DEPLOYMENT.md)
- [RLS Audit](./RLS-AUDIT.md)
- [Changelog](./CHANGELOG.md)

---

Current version: **Milestone 2.5 (Production Ready)**
Ready to deploy to Vercel. See `DEPLOYMENT.md`.