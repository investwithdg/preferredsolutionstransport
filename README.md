# Preferred Solutions Transport - Delivery Platform

A modern, full-service delivery platform built with Next.js, Supabase, and Stripe. This platform provides end-to-end delivery management from quote request to proof of delivery.

## ⚡ Quick Start for Developers

**First time setup? Follow these steps:**

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd preferredsolutionstransport
   npm install
   ```

2. **Configure environment**

   ```bash
   cp env.example .env.local
   # Edit .env.local with your Supabase, Stripe, HubSpot, and Google Maps credentials
   ```

3. **Set up database**
   - Run `supabase/consolidated-schema.sql` in Supabase SQL Editor
   - Run all migrations in `supabase/migrations/` folder

4. **Create test users**
   - Follow [`docs/TEST_USERS_SETUP.md`](./docs/TEST_USERS_SETUP.md)
   - Create auth users in Supabase Dashboard
   - Run `supabase/seeds/complete_test_data.sql` for test data

5. **Run development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

6. **Test with master users**
   - Admin: `admin@test.preferredsolutions`
   - Dispatcher: `dispatcher@test.preferredsolutions`
   - Driver: `driver@test.preferredsolutions`
   - Customer: `customer@test.preferredsolutions`

**For detailed testing instructions, see [`docs/TESTING.md`](./docs/TESTING.md)**

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

## 🚀 Current Status: Production Ready

**✅ Core Platform Complete**

- Customer quote submission with automatic Google Maps distance calculation
- Stripe payment processing with webhook automation
- Order creation and management system
- Dispatcher queue with driver assignment
- HubSpot integration for contact/deal management with configurable pipelines
- Complete API infrastructure with rate limiting

**✅ User Management & Dashboards Complete**

- Driver authentication & management system
- Driver assignment to orders (UI and API)
- Order status updates by drivers
- Driver dashboard for order management
- Admin dashboard (user/driver/order management)
- Customer order tracking page
- Customer dashboard (order history)

**✅ Real-Time Features & Notifications (Phase 1-3 Complete)**

- ✅ Email notifications via HubSpot (order confirmation, driver assignment, status updates)
- ✅ Live driver location tracking with Google Maps
- ✅ Real-time map on customer tracking page (pickup, dropoff, driver location with ETA)
- ✅ Background location tracking for drivers
- ✅ PWA support (installable app, offline functionality)
- ✅ Service worker with background sync
- ✅ Admin logs viewer with CSV export
- ⏳ Push notifications for drivers (ready, needs VAPID keys)
- ⏳ Supabase Realtime integration (planned)
- ❌ SMS notifications (future - requires Twilio setup)

**🎨 Modern UI/UX System**

- Design system with shadcn/ui components
- Tailwind CSS with custom design tokens
- Toast notifications (Sonner)
- Confirmation dialogs for critical actions
- Advanced filters and search (customer dashboard)
- Beautiful auth and thank-you pages
- Mobile-optimized driver interface
- WCAG AA accessibility compliant
- Comprehensive loading/empty/error states
- Professional branding throughout

**🚧 Milestone 4: Analytics & Optimization**

- Revenue analytics dashboard
- Driver performance metrics
- Customer behavior analysis
- Route optimization
- Pricing optimization tools

**🚧 Future Enhancements**

- Customer ratings and reviews
- Recurring delivery schedules
- Multi-stop deliveries
- Fleet management tools

## 📋 Core Features

### Customer Experience

- **Quote Request**: Distance-based pricing with automatic Google Maps distance calculation
- **Secure Payments**: Stripe integration with webhook automation
- **Order Tracking**: Live map tracking with driver location and ETA
- **Track Portal**: Public order lookup for customers and guests
- **Customer Dashboard**: Order history and active order management

### Operations & Management

- **Dispatcher Queue**: Real-time view of orders ready for dispatch
- **Driver Assignment**: Dispatchers can assign available drivers to orders
- **Driver Dashboard**: Drivers can view assigned orders and update their status
- **Admin Dashboard**: Complete management interface for users, drivers, orders, pricing, logs, and system health checks
- **Order Management**: Automatic order creation after successful payment

### Real-Time Features & Notifications

- **📧 Email Notifications**: Automated emails via HubSpot for order confirmation, driver assignment, and status updates
- **📬 Driver Alerts**: Real-time driver email + SMS notifications (Twilio optional) for assignments and status changes
- **🗺️ Live Driver Tracking**: Real-time Google Maps integration showing driver location with automatic ETA calculation
- **📍 Background Location**: Automatic location updates every 30 seconds for active deliveries
- **📱 PWA Support**: Installable mobile app with offline capabilities and background sync
- **📊 Admin Logs & Reports**: Event log viewer with filtering and CSV export for orders and logs
- **🔄 Offline Mode**: Service worker caches data and syncs updates when connection restored

### Integrations & Infrastructure

- **HubSpot Sync**: Automatic contact and deal creation with configurable pipelines and stages
- **Database**: Full audit trail and event logging with Row Level Security
- **API Infrastructure**: Rate limiting, validation, and comprehensive endpoints
- **Deployment Ready**: Vercel deployment configuration included

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + PWA
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Design System**: Custom design tokens with CSS variables
- **Forms**: react-hook-form + @hookform/resolvers
- **Notifications**: Sonner (toast notifications)
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth with @supabase/ssr
- **Maps**: Google Maps via @react-google-maps/api
- **Payments**: Stripe Checkout + Webhooks
- **CRM**: HubSpot API integration
- **Deployment**: Vercel-ready configuration

## ⚡ Quick Start

### 1. Environment Setup

Copy the environment template and configure your services:

```bash
cp env.example .env.local
```

**Critical Environment Variables:**

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Required for quote form AND live tracking maps
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side database operations
- `STRIPE_SECRET_KEY` & `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Payment processing
- `HUBSPOT_PRIVATE_APP_TOKEN` - CRM integration + email notifications
- `NEXT_PUBLIC_APP_URL` - Your app URL (for email tracking links, default: http://localhost:3000)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` - Optional SMS alerts for drivers (use Messaging Service SID instead of `TWILIO_FROM_NUMBER` if preferred)

**NEW for Phase 1-3:**

- Google Maps now requires **Maps JavaScript API, Geocoding API, and Geometry Library** enabled
- HubSpot token needs transactional email scope for notifications
- Database migration required: run `supabase/migrations/001_add_driver_locations.sql`

### 2. Database Setup

**Run the consolidated schema in Supabase SQL Editor:**

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/consolidated-schema.sql`
3. Paste and execute in the SQL Editor
4. Verify success - you should see "COMPLETE SCHEMA DEPLOYMENT SUCCESSFUL!"

This single file contains:

- All tables (customers, quotes, orders, drivers, dispatch_events, webhook_events, users)
- Row Level Security policies for all user roles
- Production-ready indexes and constraints
- Rate limiting infrastructure
- Monitoring functions
- Test data seeding

**Optional: Set up user roles after creating auth users:**

1. Create users in Supabase Auth → Users
2. Update emails in `supabase/seeds/initial_roles.sql`
3. Run the seed file to assign roles and link driver/customer records

### 3. Stripe Webhook Setup

**Local development:**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
```

**Production:** Create webhook in Stripe Dashboard pointing to your domain's `/api/stripe/webhook` endpoint.

### 4. Install and Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Validation & Quality Checks

This project has **automated validation** to prevent deployment failures:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Combined validation (runs before build automatically)
npm run validate

# Full build with validation
npm run build

# Additional code quality checks
npm run depcheck
npm run tsprune
npm run analyze
```

**🔒 Automated Pre-deployment Checks:**

- ✅ Pre-commit hooks run on staged files (ESLint, TypeScript, Prettier)
- ✅ Pre-push hooks run full validation before pushing
- ✅ GitHub Actions CI validates all pushes/PRs
- ✅ Vercel build includes prebuild validation

**Validation Pipeline:**

```
Developer writes code
       ↓
[PRE-COMMIT] → ESLint + TypeScript + Prettier on staged files
       ↓
[PRE-PUSH] → Full typecheck + lint
       ↓
[GITHUB CI] → Parallel: Lint | TypeCheck | Build
       ↓
[VERCEL] → Clean install + prebuild validation + build
```

**Emergency bypass** (not recommended): Use `--no-verify` flag with git commands.

## 🧪 Testing the Complete Flow

Use the script in `scripts/test-api.sh` or test manually:

1.  Go to `/quote`, submit a request, then click Continue to Payment
2.  Complete Stripe test checkout (4242 4242 4242 4242)
3.  Return to `/thank-you`
4.  Visit `/dispatcher` and you should see a new order with `ReadyForDispatch`
5.  Assign an available driver to the order
6.  Visit `/driver` and verify you can see the assigned order and update its status
7.  In your Stripe CLI window, you should see `checkout.session.completed`

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

## 🚀 Deployment to Vercel

### Prerequisites

- All third-party services configured (Supabase, Stripe, HubSpot, Google Maps)
- Code pushed to GitHub
- Vercel account (free tier works)

### Quick Deploy Steps

1. **Import to Vercel**: Connect your GitHub repository
2. **Add Environment Variables**: Copy ALL variables from `.env.local` to Vercel dashboard
   - **Critical**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (app appears blank without this)
   - **Critical**: All Supabase keys
   - **Critical**: All Stripe keys
   - **Recommended**: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`
3. **Deploy**: Vercel auto-builds and deploys
4. **Update Stripe Webhook**: Point to your production URL `/api/stripe/webhook`
5. **Test**: Verify `/api/health` shows all systems connected

### Troubleshooting Common Issues

**App appears blank on Vercel:**

- Missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - quote page waits for Google Maps to load

**Build failures:**

- TypeScript errors - run `npm run build` locally to test
- Missing environment variables during build

**Runtime errors:**

- Check Vercel Function logs in dashboard
- Verify all environment variables are set correctly
- Test API endpoints individually (`/api/health`, `/api/quote`)

**Stripe webhook failures:**

- Webhook URL must match your production domain
- `STRIPE_WEBHOOK_SECRET` must match the webhook endpoint secret

## 🔒 Security & Role-Based Access Control

### User Roles

- **ANONYMOUS** - Public users (quote requests only)
- **RECIPIENT** - Authenticated customers (view own orders/tracking)
- **DRIVER** - Delivery drivers (manage assigned orders, update status)
- **DISPATCHER** - Operations staff (full order management, driver assignment)
- **ADMIN** - System administrators (full access, user management)
- **SERVICE_ROLE** - Backend API operations (full database access)

### Security Features

- Row Level Security (RLS) with role-based policies for all tables
- Service role key for secure server-side operations (never exposed to client)
- Webhook signature verification
- Input validation with Zod schemas
- Rate limiting on API endpoints
- Audit logging for all operations

## 🗺 Roadmap

- ✅ **Production Ready**: Complete delivery platform with real-time tracking, notifications, and modern UI
- 🚧 **Phase 4**: Advanced analytics, reporting, and optimization features
- 🚧 **Future Enhancements**: Customer ratings, recurring deliveries, multi-stop routes, fleet management

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

---

**📚 Documentation:**

- `README.md` - This file: project overview, features, and quick start
- `IMPLEMENTATION.md` - Technical implementation guide (authentication, HubSpot, real-time)
- `REFERENCE.md` - Operational reference (deployment, configuration, troubleshooting)
- `DESIGN_SYSTEM.md` - Complete design system documentation
- `PROOF_OF_DELIVERY_README.md` - Proof of delivery system guide

**🚀 Ready for Milestone 4:** Analytics, optimization, and advanced features.
