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

## 🚀 Current Status: Milestone 2.5 (Nearly Complete)

**✅ Milestone 1: Complete (Production Ready)**
- Customer quote submission with distance-based pricing
- Stripe payment processing (test mode ready)
- Order creation via webhook automation
- Dispatcher queue with driver assignment
- HubSpot integration for contact/deal management
- Complete API infrastructure

**✅ Milestone 2: Complete**
- Driver authentication & management (schema complete)
- Driver assignment to orders (UI and API complete)
- Order status updates by drivers (UI and API complete)
- Basic driver dashboard (UI and API complete)
- **NEW: Admin dashboard** (user/driver/order management)
- **NEW: Customer order tracking page**
- **NEW: Customer dashboard** (order history)

**✅ Milestone 2.5: Complete**
- **Google Maps Distance Matrix integration** (automatic distance calculation)
- **HubSpot pipeline configuration** (customizable stages and pipelines)
- **Vercel deployment ready** (vercel.json configured)
- **Customer-facing UIs** (tracking and dashboard)

**🚧 Future Milestones**
- Real-time order tracking & notifications (WebSockets)
- Push notifications for drivers
- Enhanced security & role-based permissions
- Analytics & reporting dashboards

## 📋 Current Features (M1, M2 & M2.5)

- **Customer Quote Form**: Distance-based pricing with **automatic Google Maps distance calculation**
- **Stripe Integration**: Secure payment processing with webhook automation
- **Order Management**: Automatic order creation after successful payment
- **Dispatcher Queue**: Real-time view of orders ready for dispatch
- **Driver Assignment**: Dispatchers can assign available drivers to orders
- **Driver Dashboard**: Drivers can view assigned orders and update their status
- **Admin Dashboard**: Complete management interface for users, drivers, orders, and pricing
- **Customer Tracking**: Real-time order tracking page for customers
- **Customer Dashboard**: Order history and active order management for customers
- **HubSpot Sync**: Automatic contact and deal creation with **configurable pipelines and stages**
- **Database**: Full audit trail and event logging
- **Vercel Ready**: Production deployment configuration included

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

- Open `supabase/consolidated-schema.sql`
- Copy all contents and run it in the Supabase SQL Editor
- This file contains the complete schema, RLS policies, indexes, triggers, monitoring functions, and rate limiting
- Safe to re-run: it includes `IF NOT EXISTS` and `DROP POLICY IF EXISTS` guards

Optional: seed initial roles and mappings after you create your auth users (via Supabase Auth > Users). Update the emails in the seed file or use your real emails, then run it:

- Open `supabase/seeds/initial_roles.sql`
- Update the sample emails to match your users (admin/dispatcher/driver/recipient)
- Run the file in the Supabase SQL Editor to map roles and link driver/customer records

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

1.  Go to `/quote`, submit a request, then click Continue to Payment
2.  Complete Stripe test checkout (4242 4242 4242 4242)
3.  Return to `/thank-you`
4.  Visit `/dispatcher` and you should see a new order with `ReadyForDispatch`
5.  Assign an available driver to the order
6.  Visit `/driver`, select the assigned driver from the demo dropdown
7.  Verify you can see the assigned order and update its status
8.  In your Stripe CLI window, you should see `checkout.session.completed`

## 💰 Pricing Configuration

Pricing currently in `lib/config.ts`:
- Base fee: $50.00
- Per mile: $2.00
- Fuel surcharge: 10% of subtotal

## 🗃 Database Schema

Core tables: `customers`, `quotes`, `orders`, `dispatch_events`, `webhook_events`, `drivers`.

- `customers.email` has a unique constraint to support upserts
- `dispatch_events` is append-only and idempotent via `(source, event_id)`
- Order status transitions are validated via triggers
- `drivers.user_id` is nullable to support creating drivers before full auth integration

## 🔌 API Routes

- `POST /api/quote` → creates customer + quote with pricing
- `POST /api/checkout` → creates Stripe checkout session
- `POST /api/stripe/webhook` → verifies event, creates order, logs dispatch event, syncs to HubSpot (optional)
- `GET, POST /api/drivers` → manage drivers
- `POST /api/orders/assign` → assigns a driver to an order
- `PATCH /api/orders/:orderId/status` → updates order status

## 🚀 Deployment

Set all environment variables in your hosting provider and deploy. `VERCEL_URL` is auto-set on Vercel.

## 🔒 Security & Best Practices

- Row Level Security (RLS) hardened with explicit role policies (admin, dispatcher, driver, recipient)
- Service role key used for secure server-side operations only (never expose to client)
- Webhook signature verification
- Input validation with Zod

## 🗺 Roadmap

- ✅ M1: Complete - Core quote-to-payment flow
- ✅ M2: Complete - Driver management & actions
- ✅ M2.5: Complete - Admin UI, Customer UIs, Google Maps, HubSpot config
- 🚧 M3: Real-time tracking, notifications, WebSockets
- 🚧 M4: Advanced analytics & reporting

## 🌐 Application Routes

### Customer Routes
- `/` - Homepage
- `/quote` - Request quote and checkout
- `/track/[orderId]` - Track order status
- `/customer/dashboard` - Order history and active orders
- `/thank-you` - Post-payment confirmation

### Staff Routes (Authentication Required)
- `/dispatcher` - Dispatcher dashboard (admin/dispatcher roles)
- `/driver` - Driver dashboard (driver role)
- `/admin` - Admin dashboard (admin role only)
- `/auth/sign-in` - Authentication page

### API Routes
- `POST /api/quote` - Create quote
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Process Stripe webhooks
- `GET/POST /api/drivers` - Manage drivers
- `POST /api/orders/assign` - Assign driver to order
- `PATCH /api/orders/:orderId/status` - Update order status
- `POST /api/orders/by-driver` - Get orders by driver

## 📚 Additional Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Step-by-step Vercel deployment instructions
- [RLS Audit](./RLS-AUDIT.md) - Security and Row Level Security policies
- [Changelog](./CHANGELOG.md) - Version history and updates

---

**Current Version: Milestone 2.5 (Production Ready)**

Ready to deploy to Vercel! See [DEPLOYMENT.md](./DEPLOYMENT.md) for instructions.