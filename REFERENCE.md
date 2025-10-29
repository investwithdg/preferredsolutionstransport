# Operational Reference Guide

This document consolidates all essential information for deploying, configuring, testing, and operating the Preferred Solutions Transport platform.

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Environment Setup](#2-environment-setup)
3. [Database Setup](#3-database-setup)
4. [Deployment to Vercel](#4-deployment-to-vercel)
5. [Configuration](#5-configuration)
6. [Troubleshooting](#6-troubleshooting)
7. [Security & Access Control](#7-security--access-control)
8. [Demo Mode](#8-demo-mode)
9. [API Routes](#9-api-routes)

---

## 1. Quick Start

### Install and Run

```bash
# Copy environment template
cp env.example .env.local

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Testing Scripts

```bash
npm run typecheck    # TypeScript validation
npm run depcheck     # Check for unused dependencies
npm run tsprune      # Find unused exports
npm run analyze      # Bundle size analysis
npm run sweep        # Run all checks
```

---

## 2. Environment Setup

### Critical Environment Variables

**Supabase (REQUIRED):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Stripe (REQUIRED):**
```env
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
```

**Google Maps (REQUIRED for quote form):**
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
GOOGLE_MAPS_API_KEY=AIza...
```

**HubSpot (OPTIONAL):**
```env
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...
HUBSPOT_WEBHOOK_SECRET=your_webhook_secret

# Pipeline configuration (optional - defaults provided)
HUBSPOT_PIPELINE_ID=default
HUBSPOT_STAGE_READY=appointmentscheduled
HUBSPOT_STAGE_ASSIGNED=qualifiedtobuy
HUBSPOT_STAGE_PICKED_UP=presentationscheduled
HUBSPOT_STAGE_DELIVERED=closedwon
HUBSPOT_STAGE_CANCELED=closedlost
```

**Web Push Notifications (OPTIONAL):**
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_vapid_key
VAPID_PRIVATE_KEY=your_private_vapid_key
```
*Generate keys with: `node scripts/generate-vapid-keys.js`*

**Site URLs:**
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

**Demo Mode (NEVER enable in production!):**
```env
NEXT_PUBLIC_DEMO_MODE=false
```

### Supabase Auth Setup (Updated for @supabase/ssr)

**Client Setup:**
- Uses `@supabase/ssr` for better Next.js 15 App Router support
- Client components use `createClient()` from `lib/supabase/client.ts`
- Server components use `createServerClientRSC()` from `lib/supabase/server.ts`
- Route handlers use `createRouteHandlerClient()` from `lib/supabase/route.ts`
- All API routes with service role require `export const runtime = 'nodejs'`

### Google Maps Setup

**Required APIs to enable in Google Cloud Console:**
- Maps JavaScript API
- Places API
- Geocoding API
- Geometry Library

**Implementation:**
- Uses `@react-google-maps/api` for consistent loading
- Components use `useLoadScript` hook with required libraries
- Server-side Distance Matrix API uses separate `GOOGLE_MAPS_API_KEY`

**API Key Restrictions (Production):**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Under "Application restrictions": select "HTTP referrers"
4. Add: `https://your-app.vercel.app/*`

### Stripe Webhook Setup

**Local development:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
```

**Production:**
Create webhook in Stripe Dashboard pointing to `/api/stripe/webhook` endpoint.

---

## 3. Database Setup

### Run Consolidated Schema

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
- Test data seeding (5 demo drivers)

### Optional: Set Up User Roles

After creating auth users:
1. Create users in Supabase Auth → Users
2. Update emails in `supabase/seeds/initial_roles.sql`
3. Run the seed file to assign roles and link driver/customer records

### Enable Real-Time

Ensure real-time is enabled for your tables in Supabase:

1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for tables:
   - `orders`
   - `drivers`
   - `customers`
   - `quotes`

---

## 4. Deployment to Vercel

### Prerequisites

- GitHub account
- Vercel account (free tier works)
- All third-party services configured (Supabase, Stripe, HubSpot, Google Maps)
- Code pushed to GitHub

### Quick Deploy Steps

1. **Import to Vercel**: 
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Vercel will auto-detect Next.js

2. **Add Environment Variables**: 
   - Go to Settings → Environment Variables
   - Copy ALL variables from `.env.local` to Vercel dashboard
   - **Critical**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (app appears blank without this)
   - Add variables for: Production, Preview (optional), Development (optional)

3. **Deploy**: 
   - Click Deploy or push to your main branch
   - Vercel auto-builds and deploys

4. **Update Stripe Webhook**: 
   - Point to your production URL `/api/stripe/webhook`
   - Copy the new webhook signing secret to Vercel environment variables

5. **Test**: 
   - Verify `/api/health` shows all systems connected
   - Test quote form, authentication, and order flow

### Post-Deployment Configuration

#### Configure Webhooks

**Stripe Webhooks** (for payment processing):
- URL: `https://your-domain.com/api/stripe/webhook`
- Events: `checkout.session.completed`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

**HubSpot Webhooks** (if using HubSpot):
- URL: `https://your-domain.com/api/hubspot/webhook`
- Configure in HubSpot Private App settings
- Copy the secret to `HUBSPOT_WEBHOOK_SECRET`

#### Set Up Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your custom domain
3. Update `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_BASE_URL`

### Build Verification

Before deploying, verify local build succeeds:

```bash
npm run build
```

✅ **Build Status**: The codebase successfully compiles with all TypeScript and ESLint checks passing.

### Deployment Troubleshooting

**App appears blank on Vercel:**
- Missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - quote page waits for Google Maps to load
- Check browser console for errors

**Build failures:**
- TypeScript errors - run `npm run build` locally to test
- Missing environment variables during build
- Check Vercel build logs for specific errors

**Runtime errors:**
- Check Vercel Function logs in dashboard
- Verify all environment variables are set correctly
- Test API endpoints individually (`/api/health`, `/api/quote`)

**Stripe webhook failures:**
- Webhook URL must match your production domain
- `STRIPE_WEBHOOK_SECRET` must match the webhook endpoint secret
- Check Stripe webhook logs for detailed errors

### Monitoring

Set up monitoring for:
- **Vercel Analytics**: Automatic performance monitoring
- **Sentry** (optional): Error tracking (configured but optional dependency)
- **Supabase Dashboard**: Database and API usage

### Rollback Procedure

If deployment fails:
1. Go to **Deployments** in Vercel dashboard
2. Find last working deployment
3. Click **︙** → **Promote to Production**

---

## 5. Configuration

### Pricing Configuration

Located in `lib/config.ts`:
```typescript
export const PRICING = {
  BASE_FEE: 50.00,      // $50 base fee
  PER_MILE: 2.00,       // $2 per mile
  FUEL_SURCHARGE: 0.10  // 10% fuel surcharge
};
```

### HubSpot Pipeline Configuration

To map your actual HubSpot pipeline stages:

1. Log into HubSpot
2. Go to Settings → Objects → Deals → Pipelines
3. Copy Pipeline ID and Stage IDs
4. Update environment variables:
   ```env
   HUBSPOT_PIPELINE_ID=12345678
   HUBSPOT_STAGE_READY=appointmentscheduled
   HUBSPOT_STAGE_ASSIGNED=qualifiedtobuy
   HUBSPOT_STAGE_PICKED_UP=presentationscheduled
   HUBSPOT_STAGE_DELIVERED=closedwon
   HUBSPOT_STAGE_CANCELED=closedlost
   ```

### HubSpot Webhook Configuration (Bi-Directional Sync)

### Twilio SMS Configuration (Optional)
1. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_FROM_NUMBER` **or** `TWILIO_MESSAGING_SERVICE_SID` in your environment.
2. Ensure the sending number/service is enabled for SMS in the Twilio Console.
3. Deploy environment changes and refresh the Admin dashboard → System Health to confirm `SMS` channel is active.
4. Driver alerts use the Twilio REST API directly; check Twilio logs if messages are not delivered.


Your app uses a **hybrid data model** where:
- **HubSpot owns**: CRM data (contacts, deal stages, pipeline, custom properties edited by your sales team)
- **Supabase owns**: Operational data (real-time driver tracking, order status changes, GPS coordinates)

#### Setting Up Webhooks

1. **In your HubSpot Private App Settings**:
   - Navigate to Settings → Integrations → Private Apps
   - Click on your private app → "Webhooks" tab
   - Click "Create subscription"

2. **Configure the webhook**:
   - **Target URL**: `https://your-domain.com/api/hubspot/webhook`
   - **Subscribe to events**: `contact.propertyChange`, `deal.propertyChange`
   - **Properties to monitor**: Select "All properties" or specific ones you want to sync

3. **Copy the webhook secret**:
   - Add it to your `.env.local`: `HUBSPOT_WEBHOOK_SECRET=your_webhook_secret_here`

4. **Test the webhook**:
   - Use HubSpot's webhook testing tool
   - Verify in your app logs that the webhook was received and processed

#### What Syncs from HubSpot

The following HubSpot properties automatically sync back to your app:
- **Contact fields**: name, email, phone → updates customer records
- **Deal fields**: custom properties you've mapped (pickup/dropoff addresses, special instructions, etc.)

**Note**: Order status and driver assignment remain controlled by the app to prevent conflicts with real-time operational data.

#### Validate HubSpot Properties

Run validation script to ensure all properties are configured:
```bash
node scripts/validate-hubspot-properties.js
```

---

## 6. Troubleshooting

### Google Maps Not Loading

**Check API Key:**
```bash
# Verify in .env.local:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

**Enable Required APIs** (Google Cloud Console → APIs & Services → Library):
- Maps JavaScript API ✓
- Places API ✓
- Geocoding API ✓

**Check API Key Restrictions** (Google Cloud Console → APIs & Services → Credentials):
1. Click on your API key
2. Under "Application restrictions":
   - For development: "None" or add `http://localhost:3000/*`
   - For production: Add your domain `https://your-domain.com/*`
3. Under "API restrictions":
   - Either "Don't restrict key" or select the specific APIs you enabled

**Billing Account:**
Ensure your Google Cloud project has a billing account attached. Google Maps requires billing to be enabled even for the free tier.

**Common Maps Errors:**
- **"InvalidKeyMapError"** - API key is invalid or deleted
- **"RefererNotAllowedMapError"** - Domain not in API key restrictions
- **"ApiNotActivatedMapError"** - Required APIs not enabled
- **"QuotaExceededError"** - API quota exceeded

### Google OAuth Not Working

**Check Supabase OAuth Configuration:**
1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Ensure Google provider is **enabled**
3. Verify Client ID and Client Secret are correctly entered
4. Save the configuration

**Check Google Cloud Console:**
1. Go to APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `https://[your-project-ref].supabase.co/auth/v1/callback`
   - For local development: `http://localhost:54321/auth/v1/callback`

**Check Supabase URL Configuration** (Supabase Dashboard → Authentication → URL Configuration):
```
Site URL: http://localhost:3000 (for development)
          https://your-domain.com (for production)

Redirect URLs:
- http://localhost:3000/auth/callback
- https://your-domain.com/auth/callback
```

**OAuth Consent Screen** (Google Cloud Console):
1. Go to APIs & Services → OAuth consent screen
2. Ensure it's configured and published (or in test mode with your email added)
3. Add required scopes: email, profile

**Common OAuth Errors:**
- **"OAuth is not properly configured"** - Google provider not enabled in Supabase
- **"Invalid redirect URI"** - Mismatch between Google Console and Supabase settings
- **"Access denied"** - User cancelled the sign-in process
- **"Server error"** - Check Supabase service status

### Debug Tools

**Debug Page**: Visit `/debug/google` to access comprehensive diagnostics:
- Environment variable presence
- Google Maps API key validity
- Supabase connection status
- OAuth configuration
- Live testing of Maps and OAuth functionality

**Console Logging**: Open browser Developer Console for detailed debug information:
- **[Google OAuth Debug]** - OAuth flow information
- **[Auth Callback Debug]** - Callback processing details
- **[Google Maps Debug]** - Maps API loading status
- **[Sign In Debug]** - Authentication error details

### Authentication Issues

**Verify Supabase project URL and keys are correct:**
- Check environment variables in `.env.local`
- Ensure keys match Supabase Dashboard → Settings → API

**Check redirect URLs:**
- In Supabase Dashboard and OAuth providers
- Must match your actual domain/localhost

**Ensure users table has correct role assignments:**
```sql
SELECT * FROM public.users WHERE email = 'your@email.com';
```

### Stripe Webhook Failures

**Verify webhook URL matches your domain:**
- Should be: `https://your-domain.com/api/stripe/webhook`

**Check STRIPE_WEBHOOK_SECRET:**
- Must match webhook endpoint secret from Stripe Dashboard
- Different for each webhook endpoint (development vs production)

**Review Vercel function logs:**
- Check for detailed error messages
- Look for signature verification failures

### Database Connection Issues

**Verify Supabase credentials:**
- Check environment variables are set correctly
- Test connection from Supabase Dashboard

**Check RLS policies:**
- Ensure service role has necessary access
- Review policies in Supabase Dashboard → Authentication → Policies

**Review Supabase logs:**
- Go to Supabase Dashboard → Logs
- Check for connection errors or permission issues

### Real-Time Features Not Working

**Verify Supabase Real-Time is enabled:**
- Go to Supabase Dashboard → Database → Replication
- Ensure tables have replication enabled

**Check browser console:**
- Look for WebSocket connection errors
- Verify `lastUpdate` timestamp is changing

**Check Supabase logs:**
- Look for broadcast events
- Verify subscriptions are being created

### Quick Fixes

**Clear Browser Cache:**
```bash
# Hard refresh
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

**Restart Next.js:**
```bash
npm run dev
```

**Check Service Status:**
- Supabase: https://status.supabase.com/
- Vercel: https://www.vercel-status.com/
- Stripe: https://status.stripe.com/

**Verify API Key Format:**
- Google Maps API key should be 39 characters long
- Format: `AIzaSy...` (starts with AIza)

### Debug Information to Collect

When reporting issues, provide:
1. **Console Logs**: All logs with [Debug] tags
2. **Network Tab**: Failed requests (especially to googleapis.com)
3. **Debug Page Results**: Screenshot of `/debug/google`
4. **Error Messages**: Exact error text from UI or console
5. **Environment**: Browser, OS, Node version

---

## 7. Security & Access Control

### User Roles

- **ANONYMOUS** - Public users (quote requests only)
- **RECIPIENT** - Authenticated customers (view own orders/tracking)
- **DRIVER** - Delivery drivers (manage assigned orders, update status)
- **DISPATCHER** - Operations staff (full order management, driver assignment)
- **ADMIN** - System administrators (full access, user management)

### Security Features

- **Row Level Security (RLS)** with role-based policies for all tables
- **Service role key** for secure server-side operations (never exposed to client)
- **Webhook signature verification** for Stripe and HubSpot
- **Input validation** with Zod schemas
- **Rate limiting** on API endpoints
- **Audit logging** for all operations

### Middleware Protection

Protected routes automatically redirect based on authentication status:
- `/customer/*` - Requires recipient role
- `/driver` - Requires driver role
- `/dispatcher` - Requires dispatcher or admin role
- `/admin` - Requires admin role

---

## 8. Demo Mode

Demo Mode allows you to quickly switch between different user roles without authentication - perfect for testing and demonstrations.

### Enabling Demo Mode

1. Add to your `.env.local`:
   ```env
   NEXT_PUBLIC_DEMO_MODE=true
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

3. You'll see a yellow warning banner and floating demo widget

⚠️ **IMPORTANT**: Never enable Demo Mode in production!

### Role Switching

- **Customer**: View quotes, make payments, track orders
- **Dispatcher**: Assign drivers to orders, view dispatch queue
- **Driver**: Accept orders, update delivery status
- **Admin**: Manage users, drivers, view all orders

### Quick Actions

Pre-configured navigation for complete workflows:
1. **Start as Customer → Quote**: Begin customer journey
2. **View as Dispatcher → Assign**: Switch to dispatcher view
3. **View as Driver → Update Status**: View assigned orders as driver
4. **View as Admin → Manage**: Access admin dashboard

### Demo Features

- ✅ Role switching without authentication
- ✅ 3 demo drivers available for selection
- ✅ Quick action flows for testing workflows
- ✅ State persistence across page refreshes
- ✅ Create test orders instantly
- ✅ Reset all demo data between tests

### Testing Scripts

```bash
npm run test-demo-mode.sh  # Test demo mode functionality
npm run test-api.sh        # Test API endpoints
npm run smoke.sh           # Quick smoke test
```

---

## 9. API Routes

### Core Endpoints

- `POST /api/quote` → creates customer + quote with pricing
- `POST /api/checkout` → creates Stripe checkout session
- `POST /api/stripe/webhook` → processes Stripe webhooks, creates orders
- `POST /api/hubspot/webhook` → receives HubSpot property changes, syncs to Supabase
- `GET, POST /api/drivers` → manage drivers
- `POST /api/drivers/location` → update driver location
- `POST /api/drivers/push-subscription` → register push notification subscription
- `POST /api/orders/assign` → assigns driver to order
- `PATCH /api/orders/:orderId/status` → updates order status
- `POST /api/orders/by-driver` → get orders by driver
- `POST /api/track/verify` → validate public tracking lookups (guest + customer)
- `GET /api/health` → legacy health check endpoint
- `GET /api/admin/health` → system health diagnostics (admin only)
- `GET /api/admin/logs` → retrieve system logs (admin only)

### Testing API Endpoints

Use the provided test script:
```bash
./scripts/test-api.sh
```

Or test manually with curl:
```bash
# Health check
curl http://localhost:3000/api/health

# Create quote
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","phone":"555-1234","pickupAddress":"123 Main St","dropoffAddress":"456 Oak Ave"}'
```

---

## Additional Resources

- **Main Documentation**: See `README.md` for project overview and features
- **Implementation Guide**: See `IMPLEMENTATION.md` for detailed technical documentation
- **Design System**: See `DESIGN_SYSTEM.md` for UI component guidelines
- **Environment Variables**: See `env.example` for all configuration options

---

**Last Updated**: October 2025  
**Build Status**: ✅ Passing
