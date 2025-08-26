# Preferred Solutions Transport - Delivery Platform

A modern, full-service delivery platform built with Next.js, Supabase, and Stripe. This platform provides end-to-end delivery management from quote request to proof of delivery.

## 🎯 End-State Vision

### Users & Outcomes

**Customer**: Request quotes, pay securely, receive live delivery updates & receipts.
**Dispatcher**: Manage incoming orders, assign drivers, monitor jobs in real-time.  
**Driver**: Accept jobs, update statuses, capture proof of delivery.
**Admin**: Manage pricing, products, users, and view comprehensive reports.

### Complete Workflow

1. **Customer submits Quote Request** → pricing rules applied (base + per-mile + surcharges)
2. **Customer pays via Stripe Checkout** → secure payment processing
3. **Payment webhook** → Supabase Order created (status=ReadyForDispatch)
4. **Dispatcher assigns driver** → job routing and management
5. **Driver App receives job** → updates statuses (PickedUp → Delivered), uploads proof
6. **Notifications flow** → customer & dispatcher receive updates; receipt/invoice issued

## 🚀 Current Status: Milestone 1

**✅ IMPLEMENTED (Ready for Production)**
- Customer quote submission with distance-based pricing
- Stripe payment processing (test mode ready)
- Order creation via webhook automation
- Dispatcher queue (read-only view)
- HubSpot integration for contact/deal management
- Complete API infrastructure

**🚧 COMING IN FUTURE MILESTONES**
- Driver authentication & mobile app
- Real-time order tracking & notifications
- Driver assignment & status management
- Admin dashboard & reporting
- Google Maps integration
- Enhanced security & permissions

## 📋 Current Features (M1)

- **Customer Quote Form**: Distance-based pricing with instant calculation
- **Stripe Integration**: Secure payment processing with webhook automation
- **Order Management**: Automatic order creation after successful payment
- **Dispatcher Queue**: Real-time view of orders ready for dispatch
- **HubSpot Sync**: Automatic contact and deal creation
- **Database**: Full audit trail and event logging

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Payments**: Stripe Checkout + Webhooks
- **CRM**: HubSpot API integration
- **Deployment**: Vercel-ready configuration

## ⚡ Quick Start

### 1. Environment Setup

Copy the environment template to create your local configuration:
```bash
cp env.example .env.local
```

Fill in your **actual** environment variables in `.env.local`.

### 2. Database Setup (Consolidated)

Run the single consolidated schema file in your Supabase SQL editor:

- Open `supabase/schema.sql`
- Copy all contents and run it in Supabase SQL Editor
- This file includes both the base schema and all hardening/guard functions (no separate migration file is needed)
- If rerun, duplicate object warnings are safe to ignore

### 3. Stripe Webhook Setup

For local development:
```bash
# Install Stripe CLI and forward events
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
```

For production, add your webhook in the Stripe Dashboard and set `STRIPE_WEBHOOK_SECRET`.

### 4. Install and Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## 🧪 Testing the Complete Flow

Use the script in `scripts/test-api.sh` or test manually:

1. Go to `/quote`, submit a request, then click Continue to Payment
2. Complete Stripe test checkout (4242 4242 4242 4242)
3. Return to `/thank-you`
4. Visit `/dispatcher` and you should see a new order with `ReadyForDispatch`
5. In your Stripe CLI window, you should see `checkout.session.completed`

## 💰 Pricing Configuration

Pricing currently in `lib/config.ts`:
- Base fee: $50.00
- Per mile: $2.00
- Fuel surcharge: 10% of subtotal

## 🗃 Database Schema

Core tables: `customers`, `quotes`, `orders`, `dispatch_events`, `webhook_events`.

- `customers.email` has a unique constraint to support upserts
- `dispatch_events` is append-only and idempotent via `(source, event_id)`
- Order status transitions are validated via triggers

## 🔌 API Routes

- `POST /api/quote` → creates customer + quote with pricing
- `POST /api/checkout` → creates Stripe checkout session
- `POST /api/stripe/webhook` → verifies event, creates order, logs dispatch event, syncs to HubSpot (optional)

## 🚀 Deployment

Set all environment variables in your hosting provider and deploy. `VERCEL_URL` is auto-set on Vercel.

## 🔒 Security & Best Practices

- RLS enabled with permissive policies for M1
- Service role key used for secure server-side operations
- Webhook signature verification
- Input validation with Zod

## 🗺 Roadmap

- M2: Driver management & actions
- M3: Real-time tracking, Google Maps, notifications
- M4: Admin analytics & reporting

---

Current Version: Milestone 1 (Production Ready)