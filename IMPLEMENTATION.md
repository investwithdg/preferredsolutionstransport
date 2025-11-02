# Implementation Guide

This guide provides detailed technical implementation information for developers working on the Preferred Solutions Transport platform.

## Table of Contents

1. [Authentication System](#1-authentication-system)
2. [HubSpot Integration](#2-hubspot-integration)
3. [Real-Time Features](#3-real-time-features)
4. [Files Reference](#4-files-reference)

---

## 1. Authentication System

### Overview

Comprehensive authentication system with multiple login methods and role-based access control.

### Supported Authentication Methods

1. **Email/Password**: Traditional email and password login
2. **Magic Link**: Passwordless email authentication
3. **Google OAuth**: Social login with Google accounts
4. **Facebook OAuth**: Social login with Facebook accounts

### Role-Based Signup Flows

#### Customer Signup

- Email/password registration
- Google/Facebook OAuth
- Creates 'recipient' role user record
- Links to existing customer records via email

#### Driver Signup

- Email/password registration (with vehicle info)
- Google/Facebook OAuth → role selection page
- Required fields: phone, vehicle make/model, license plate
- Creates 'driver' role and driver record

#### Dispatcher Signup

- Email/password registration
- Google/Facebook OAuth
- Creates 'dispatcher' role user record

### Authentication Flows

#### Flow 1: Email/Password Sign Up

1. User visits role-specific signup page (customer/driver/dispatcher)
2. Fills in form with email, password, and role-specific info
3. Account created with specified role in `users` table
4. Driver records created automatically for driver signups
5. Email verification sent
6. Redirects to sign-in page

#### Flow 2: Email/Password Sign In

1. User visits `/auth/sign-in`
2. Selects their role from dropdown
3. Toggles to "Password" mode
4. Enters email and password
5. Signs in and redirects to role-appropriate dashboard

#### Flow 3: Magic Link Sign In

1. User visits `/auth/sign-in`
2. Selects their role from dropdown
3. Keeps "Magic Link" mode selected
4. Enters email
5. Receives magic link via email
6. Clicks link and redirects to role-appropriate dashboard

#### Flow 4: Social OAuth (First Time)

1. User clicks Google/Facebook button on sign-in or signup page
2. Completes OAuth flow with provider
3. Redirects to `/auth/oauth-role-select`
4. Selects their role (Customer/Driver/Dispatcher)
5. Role saved to database
6. Redirects to role-appropriate dashboard

#### Flow 5: Social OAuth (Returning User)

1. User clicks Google/Facebook button
2. System detects existing role
3. Directly redirects to appropriate dashboard

### Role-Based Redirects

After successful authentication:

- **Customer (recipient):** → `/customer/dashboard`
- **Driver:** → `/driver`
- **Dispatcher:** → `/dispatcher`
- **Admin:** → `/dispatcher` (or `/admin` if admin-only routes exist)

### Supabase Configuration

#### Enable Authentication Providers

Go to Supabase Dashboard → Authentication → Providers:

**Email Provider:**

- Enable "Email" provider
- Enable "Confirm email" if desired
- Configure email templates

**Google OAuth:**

1. Create OAuth credentials in Google Cloud Console
2. Enable "Google" provider in Supabase
3. Add Client ID and Secret
4. Add authorized redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`

**Facebook OAuth:**

1. Create Facebook App in Meta Developer Portal
2. Enable "Facebook" provider in Supabase
3. Add App ID and Secret
4. Add OAuth Redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`

#### Site URL Configuration

Settings → API:

- **Site URL:** Set to your production domain (e.g., `https://yourdomain.com`)
- **Redirect URLs:** Add:
  - `http://localhost:3000/auth/callback` (development)
  - `https://*.vercel.app/auth/callback` (Vercel preview deployments - wildcard)
  - `https://yourdomain.com/auth/callback` (production)

### Environment-Aware Authentication

The application uses environment-aware redirect URLs to support authentication across:

- **Local development** (`localhost:3000`)
- **Vercel preview deployments** (`*.vercel.app`)
- **Production** (your custom domain)

#### How It Works

**Helper Functions** (`lib/auth-helpers.ts`):

```typescript
getBaseUrl(); // Server-side: determines base URL from env vars
getAuthRedirectUrl(path); // Client/server: returns full redirect URL
```

**URL Selection Logic:**

1. **Production:** Uses `NEXT_PUBLIC_SITE_URL` if set
2. **Vercel Preview:** Uses `VERCEL_URL` (auto-injected by Vercel)
3. **Local Dev:** Falls back to `http://localhost:3000`

**Usage in Auth Flows:**
All authentication redirect URLs use `getAuthRedirectUrl('/auth/callback')` instead of hardcoded domains:

- OAuth sign-in/signup (Google, Facebook)
- Email verification links (`emailRedirectTo`)
- Password reset emails (`redirectTo`)

#### Environment Variables

| Variable               | Environment | Required | Example                                        |
| ---------------------- | ----------- | -------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Production  | Yes      | `https://preferredsolutionstransport.com`      |
| `VERCEL_URL`           | Vercel      | Auto-set | `app-git-branch-user.vercel.app` (no protocol) |

**Important:**

- `VERCEL_URL` is automatically injected by Vercel — **do not set it manually**
- `NEXT_PUBLIC_SITE_URL` must include the protocol (`https://`)

#### Supabase Wildcard Configuration

The wildcard pattern `https://*.vercel.app/auth/callback` allows **any** Vercel preview deployment to complete authentication without manually whitelisting each preview URL.

#### Testing Across Environments

Run the auth validation script:

```bash
npm run validate:auth
```

For complete testing instructions, see:

- **Setup:** `docs/VERCEL_AUTH_SETUP.md`
- **Testing Matrix:** `docs/AUTH_TESTING_CHECKLIST.md`

### Database Schema

```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id),
  email text UNIQUE,
  role user_role, -- 'admin', 'dispatcher', 'driver', 'recipient'
  created_at timestamptz DEFAULT now()
);
```

### Security Considerations

1. **Row Level Security (RLS):** All tables have RLS policies enabled
2. **Role Verification:** Middleware checks role before granting access
3. **Service Role:** Used only for system operations (user creation, linking)
4. **Password Requirements:** Minimum 6 characters enforced
5. **Email Verification:** Can be enabled in Supabase settings
6. **OAuth Security:** Handled by Supabase Auth with secure redirects

### Files Created/Modified

**New Files:**

- `app/auth/signup/customer/page.tsx` - Customer signup page
- `app/auth/signup/driver/page.tsx` - Driver signup page with vehicle info
- `app/auth/signup/dispatcher/page.tsx` - Dispatcher signup page
- `app/auth/oauth-role-select/page.tsx` - OAuth role selection page

**Modified Files:**

- `app/components/HomeHero.tsx` - Added Google Maps error handling
- `app/auth/sign-in/page.tsx` - Enhanced with role selector and auth modes
- `app/auth/callback/route.ts` - Enhanced OAuth callback handler
- `middleware.ts` - Enhanced role-based access control

---

## 2. HubSpot Integration

### Overview

Hybrid data model where HubSpot and Supabase work together:

- **HubSpot** = Source of truth for CRM data (contacts, deals, sales team edits)
- **Supabase** = Source of truth for operational data (real-time tracking, order status, GPS)

### Webhook Infrastructure

**Files Created:**

- `lib/hubspot/webhook.ts` - Signature verification and payload parsing utilities
- `lib/hubspot/reverse-mappings.ts` - Maps HubSpot properties back to Supabase columns
- `app/api/hubspot/webhook/route.ts` - Webhook endpoint that receives HubSpot events

**How It Works:**

- HubSpot sends webhook notifications when contacts or deals are updated
- Webhook signature is verified using SHA-256 HMAC with your app secret
- Events are stored in `hubspot_webhook_events` table for idempotency (prevents duplicate processing)
- Property changes are mapped to Supabase columns and updates are applied

### Database Schema Changes

**New Table:**

```sql
hubspot_webhook_events (
  id, event_id, event_type, object_type, object_id,
  portal_id, occurred_at, processed_at, payload, created_at
)
```

**New Columns:**

```sql
orders.hubspot_deal_id
customers.hubspot_contact_id
```

### Data Flow

```
┌─────────────┐                    ┌──────────────┐
│   HubSpot   │                    │   Supabase   │
│     CRM     │                    │   Database   │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │  1. Customer places order        │
       │  ◄───────────────────────────────┤
       │                                  │
       │  2. Order synced to HubSpot      │
       │  (contact + deal created)        │
       │  ◄───────────────────────────────┤
       │     (Deal ID stored back)        │
       │  ────────────────────────────────►
       │                                  │
       │  3. Sales team updates deal      │
       │     in HubSpot UI                │
       │                                  │
       │  4. Webhook sent                 │
       │  ─────────────────────────────────►
       │                                  │
       │                5. Order updated  │
       │                in Supabase       │
```

### HubSpot Property Mappings (29 Properties)

#### Core Tracking (2)

- **deal_pipeline** - Tracks Deal Pipeline stages: Quote Sent → Paid → Assigned → Delivered → Completed
- **delivery_status** - Granular delivery status: pending → assigned → in_transit → delivered / exception

#### Time Tracking (4)

- **actual_delivery_time** - Set when status changes to Delivered
- **actual_pickup_time** - Set when status changes to PickedUp
- **scheduled_delivery_time** - Set from quote if available
- **scheduled_pickup_time** - Set from quote if available

#### Driver/Vehicle (3)

- **assigned_driver** - Driver name
- **driver_name** - Kept for backward compatibility
- **driver_phone** - Driver contact number
- **vehicle_type** - Type of vehicle (car, van, truck, etc.)

#### Delivery Details (5)

- **delivery_location** - Dropoff address
- **delivery_route** - "Pickup → Dropoff" format
- **delivery_type** - standard, express, same_day, scheduled
- **weight_bracket** - light, medium, heavy, oversized
- **special_delivery_instructions** - Multi-line text for notes

#### Exception Handling (3)

- **delivery_exception_notes** - Details about exceptions
- **delivery_exception_type** - weather, address_issue, delay, etc.
- **delivery_resolution_status** - resolved, unresolved, escalated, etc.

#### Quote Properties (7)

- **quote_sent** - Boolean (always true after payment)
- **quote_source** - website, phone, email, referral, etc.
- **quote_status** - accepted (after payment)
- **recurring_frequency** - ad_hoc, daily, weekly, monthly
- **rush_requested** - Boolean flag
- **services_proposed** - Description of services
- **snapshot_audit_sent** - Multiple checkbox field

#### Original Properties (5)

- **order_id** - Unique order identifier
- **pickup_address** - Pickup location
- **dropoff_address** - Delivery destination
- **distance_miles** - Calculated distance

### Status Mapping Logic

**Deal Pipeline Mapping:**

```
ReadyForDispatch → "Paid"
Assigned → "Assigned"
PickedUp → "Assigned"
InTransit → "Assigned"
Delivered → "Delivered"
Completed → "Completed"
Canceled → "Paid"
```

**Delivery Status Mapping:**

```
ReadyForDispatch → "pending"
Assigned → "assigned"
PickedUp → "in_transit"
InTransit → "in_transit"
Delivered → "delivered"
Completed → "delivered"
Canceled → "exception"
```

### Pipeline Configuration

Configure HubSpot pipeline stages via environment variables:

```env
HUBSPOT_PIPELINE_ID=12345678
HUBSPOT_STAGE_READY=appointmentscheduled
HUBSPOT_STAGE_ASSIGNED=qualifiedtobuy
HUBSPOT_STAGE_PICKED_UP=presentationscheduled
HUBSPOT_STAGE_DELIVERED=closedwon
HUBSPOT_STAGE_CANCELED=closedlost
```

To find your pipeline IDs:

1. Log into HubSpot
2. Go to Settings > Objects > Deals > Pipelines
3. Copy Pipeline ID and Stage IDs

### Webhook Setup

1. **In HubSpot Private App Settings:**
   - Navigate to Settings → Integrations → Private Apps
   - Click on your private app → "Webhooks" tab
   - Click "Create subscription"

2. **Configure the webhook:**
   - **Target URL**: `https://your-domain.com/api/hubspot/webhook`
   - **Subscribe to events**: `contact.propertyChange`, `deal.propertyChange`
   - **Properties to monitor**: Select "All properties" or specific ones

3. **Copy the webhook secret:**
   - Add to `.env.local`: `HUBSPOT_WEBHOOK_SECRET=your_webhook_secret_here`

4. **Test the webhook:**
   - Use HubSpot's webhook testing tool
   - Verify in app logs that webhook was received and processed

### What Syncs

**From App to HubSpot (Automatic):**

- Customer contact info (email, name, phone)
- Order/deal creation
- Order status updates
- Driver assignments
- Delivery timestamps
- All custom properties mapped in `property-mappings.ts`

**From HubSpot to App (Via Webhooks):**

- Contact name, email, phone changes
- Deal custom properties (addresses, instructions, etc.)
- **NOT synced**: Pipeline stages (read-only for visibility)
- **NOT synced**: Order status (app controls operational status)

### Validation Script

Run to verify all HubSpot properties are configured:

```bash
node scripts/validate-hubspot-properties.js
```

This checks:

- All 29 properties exist
- Enumeration options for dropdowns
- Deal Pipeline values
- Warns about missing/misconfigured properties

### Files Modified

**Core Implementation:**

- `lib/hubspot/property-mappings.ts` - Added all 29 property mappings
- `lib/hubspot/client.ts` - Enhanced sync function with bidirectional linking
- `lib/hubspot/types.ts` - Extended `OrderSyncData` interface

**API Routes:**

- `app/api/stripe/webhook/route.ts` - Populates delivery route, location, type
- `app/api/orders/assign/route.ts` - Sets vehicle_type from driver data
- `app/api/orders/[orderId]/status/route.ts` - Sets actual pickup/delivery times

---

## 3. Real-Time Features

### Overview

Real-time data subscriptions and visual indicators so UI automatically updates when data changes in either Supabase or HubSpot (via webhooks).

### Real-Time Hooks

**Files Created:**

- `app/hooks/useRealtimeOrders.ts` - Subscribe to order updates
- `app/hooks/useRealtimeDrivers.ts` - Subscribe to driver updates
- `lib/supabase/client.ts` - Browser-side Supabase client

#### useRealtimeOrders Hook

Subscribe to order updates:

- Automatically fetches orders on mount
- Subscribes to Supabase real-time changes (INSERT, UPDATE, DELETE)
- Filters by customer ID, driver ID, or status
- Returns orders, loading state, error state, and last update timestamp
- Instantly updates UI when HubSpot webhook modifies an order

**Usage:**

```typescript
import { useRealtimeOrders } from '@/app/hooks/useRealtimeOrders';

const { orders, loading, error, lastUpdate } = useRealtimeOrders({
  customerId: 'uuid',
  // or driverId: 'uuid',
  // or status: 'ReadyForDispatch'
});
```

#### useRealtimeDrivers Hook

Subscribe to driver updates:

- Fetches drivers with active order counts
- Subscribes to both driver AND order changes (to update availability)
- Automatically recalculates `is_available` and `active_orders_count`
- Updates dispatcher UI when drivers become available/busy

**Usage:**

```typescript
import { useRealtimeDrivers } from '@/app/hooks/useRealtimeDrivers';

const { drivers, loading, error, lastUpdate } = useRealtimeDrivers();
```

### Visual Indicators

**File Created:**

- `app/components/shared/SyncStatusIndicator.tsx` - Shows sync status

**Components:**

1. **SyncStatusIndicator**: Shows "Synced to HubSpot" badge if `hubspot_deal_id` exists
2. **RealtimeIndicator**: Shows green pulsing dot with "Live" label and last update time

**Usage:**

```tsx
import { SyncStatusIndicator, RealtimeIndicator } from '@/app/components/shared/SyncStatusIndicator';

<RealtimeIndicator lastUpdate={lastUpdate} />
<SyncStatusIndicator hubspotDealId={order.hubspot_deal_id} lastUpdate={order.updated_at} />
```

### Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                  Real-Time Data Flow                      │
└──────────────────────────────────────────────────────────┘

1. HubSpot Webhook → Supabase Update
   ├─ Webhook updates order in Supabase
   ├─ Supabase broadcasts postgres_changes event
   └─ UI hook receives update → Re-renders component

2. Driver Action → Supabase Update
   ├─ Driver updates order status
   ├─ Supabase broadcasts postgres_changes event
   └─ All subscribed UIs update instantly

3. Dispatcher Action → Supabase Update
   ├─ Dispatcher assigns driver
   ├─ Order status changes to "Assigned"
   ├─ Supabase broadcasts to:
   │   ├─ Dispatcher UI (order removed from queue)
   │   ├─ Driver UI (new order appears)
   │   └─ Customer UI (order status updates)
   └─ Driver availability recalculates
```

### Subscription Architecture

**Example subscription:**

```typescript
channel
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'orders',
      filter: 'customer_id=eq.${customerId}', // Optional filtering
    },
    (payload) => {
      // Refetch with joins to get related data
      fetchOrders();
    }
  )
  .subscribe();
```

**Benefits:**

- No manual polling (more efficient)
- Sub-second updates
- Scales to many concurrent users
- Works seamlessly with HubSpot webhook updates

### Updated Dashboards

**Customer Dashboard** (`app/customer/dashboard/CustomerDashboardClient.tsx`):

- Real-time order subscription filtered by customer ID
- Live indicator in header showing last update
- Sync status badges on each order showing HubSpot sync state
- Automatic UI updates when orders change

**Dispatcher Dashboard** (`app/dispatcher/DispatcherClient.tsx`):

- Real-time subscription for "ReadyForDispatch" orders
- Real-time driver availability updates
- Live indicator showing when data was last updated
- Orders automatically disappear when assigned (via real-time subscription)

### Configuration

#### Enable Supabase Real-Time

Ensure real-time is enabled for your tables in Supabase:

1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for tables:
   - `orders`
   - `drivers`
   - `customers`
   - `quotes`

### Performance Considerations

**Subscription Cleanup:**

- Hooks automatically unsubscribe on component unmount
- Uses Supabase channel system for efficient connections
- Only subscribes to needed tables/filters

**Data Fetching:**

- Initial data comes from server-side props (fast first load)
- Real-time updates only refetch when changes occur
- Joins are optimized (only fetches needed relations)

**Scalability:**

- Supabase handles connection pooling
- Broadcast messages are lightweight
- Filtering happens at database level (efficient)

### Testing Real-Time Features

**Test Order Updates:**

```bash
# Open customer dashboard in browser
# In another tab/terminal, update an order via webhook or API
# Customer dashboard should update within 1 second without refresh
```

**Test HubSpot Webhook Integration:**

```bash
# 1. Update a deal property in HubSpot
# 2. Webhook fires → Supabase updates
# 3. UI instantly shows the change
# 4. Check for "Synced to HubSpot" badge
```

**Test Multi-User Scenarios:**

```bash
# Open same dashboard in 2 browser windows
# Make a change in one window
# Other window should update automatically
```

---

## 4. Files Reference

### Authentication Files

**New Pages:**

- `app/auth/signup/customer/page.tsx` - Customer registration with OAuth
- `app/auth/signup/driver/page.tsx` - Driver registration with vehicle info
- `app/auth/signup/dispatcher/page.tsx` - Dispatcher registration
- `app/auth/oauth-role-select/page.tsx` - OAuth role selection flow

**Modified Files:**

- `app/auth/sign-in/page.tsx` - Enhanced with role selector and multiple auth modes
- `app/auth/callback/route.ts` - OAuth callback with role detection and user creation
- `app/components/HomeHero.tsx` - Google Maps error handling
- `middleware.ts` - Role-based access control and route protection

### HubSpot Files

**New Files:**

- `lib/hubspot/webhook.ts` - Webhook signature verification utilities
- `lib/hubspot/reverse-mappings.ts` - HubSpot to Supabase property mapping
- `app/api/hubspot/webhook/route.ts` - Webhook endpoint handler
- `scripts/validate-hubspot-properties.js` - Property validation script

**Modified Files:**

- `lib/hubspot/property-mappings.ts` - Added 29 property mappings
- `lib/hubspot/types.ts` - Extended interfaces for new properties
- `lib/hubspot/client.ts` - Bidirectional sync with ID storage
- `app/api/stripe/webhook/route.ts` - Populate delivery properties
- `app/api/orders/assign/route.ts` - Set vehicle type and statuses
- `app/api/orders/[orderId]/status/route.ts` - Set pickup/delivery times

**Database Migrations:**

- `supabase/migrations/003_add_hubspot_webhook_events.sql`
- `supabase/migrations/004_add_hubspot_deal_id_to_orders.sql`

### Real-Time Files

**New Files:**

- `app/hooks/useRealtimeOrders.ts` - Order subscription hook
- `app/hooks/useRealtimeDrivers.ts` - Driver subscription hook
- `lib/supabase/client.ts` - Browser Supabase client for real-time
- `app/components/shared/SyncStatusIndicator.tsx` - Visual indicators

**Modified Files:**

- `app/customer/dashboard/CustomerDashboardClient.tsx` - Real-time subscriptions
- `app/dispatcher/DispatcherClient.tsx` - Real-time subscriptions

### Testing Files

**Scripts:**

- `scripts/test-api.sh` - API endpoint testing
- `scripts/test-demo-mode.sh` - Demo mode testing
- `scripts/generate-vapid-keys.js` - VAPID keys for push notifications
- `scripts/validate-hubspot-properties.js` - HubSpot property validation

---

## Additional Resources

- **Main Documentation**: See `README.md` for project overview and features
- **Operational Guide**: See `REFERENCE.md` for deployment and configuration
- **Design System**: See `DESIGN_SYSTEM.md` for UI component guidelines
- **Environment Variables**: See `env.example` for all configuration options

### Tracking Portal & Verification

- New public `/track` route with client at `app/track/page.tsx` for customers or guests to look up orders.
- `/api/track/verify` validates order ID + optional email before redirecting to live view (`/track/[orderId]`).
- Uses `createServiceRoleClient` on the backend to guard against unauthorized access while keeping the portal unauthenticated.

### Driver & Customer Notifications (Twilio + HubSpot)

- `lib/notifications/dispatcher.ts` now sends actual HubSpot emails and Twilio SMS alerts for driver assignment and status changes.
- Optional Twilio configuration is read from `TWILIO_*` env vars; if missing, SMS sending is skipped gracefully.
- Admin health endpoint `/api/admin/health` surfaces configuration gaps (Stripe, HubSpot, Google Maps, Twilio, Supabase).
- Driver dashboard (`app/driver/DriverClient.tsx`) adds Google Maps directions links plus ensures PoD submission flows through the new API.
