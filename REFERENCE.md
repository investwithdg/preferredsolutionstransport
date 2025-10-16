# Operational Reference Guide

This document consolidates all essential information for deploying, configuring, testing, and operating the Preferred Solutions Transport platform.

## 🚀 Quick Start

### Environment Setup

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

**Google Maps Setup:**
- Requires **Maps JavaScript API, Geocoding API, and Geometry Library** enabled
- HubSpot token needs transactional email scope for notifications

### Database Setup

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/consolidated-schema.sql`
3. Paste and execute in the SQL Editor
4. Verify success - should see "COMPLETE SCHEMA DEPLOYMENT SUCCESSFUL!"

**Optional: Set up user roles after creating auth users:**
1. Create users in Supabase Auth → Users
2. Update emails in `supabase/seeds/initial_roles.sql`
3. Run the seed file to assign roles and link driver/customer records

### Stripe Webhook Setup

**Local development:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
```

**Production:** Create webhook in Stripe Dashboard pointing to your domain's `/api/stripe/webhook` endpoint.

### Install and Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## 🚀 Deployment to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- All third-party services configured (Supabase, Stripe, HubSpot, Google Maps)

### Quick Deploy Steps
1. **Import to Vercel**: Connect your GitHub repository
2. **Add Environment Variables**: Copy ALL variables from `.env.local` to Vercel dashboard
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

## 🧪 Demo Mode Guide

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

## 🔐 Authentication Setup

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

### OAuth Setup Requirements

#### Google OAuth
1. Create OAuth credentials in Google Cloud Console
2. Enable "Google" provider in Supabase
3. Add Client ID and Secret
4. Add redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`

#### Facebook OAuth
1. Create Facebook App in Meta Developer Portal
2. Enable "Facebook" provider in Supabase
3. Add App ID and Secret
4. Add OAuth Redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`

### Supabase Configuration

#### Authentication Providers
- Enable "Email" provider (with email confirmation if desired)
- Configure email templates for signup, magic link, password reset

#### Site URL Configuration
- **Site URL:** Set to your production domain
- **Redirect URLs:** Add both development and production callback URLs

## 🔧 Configuration

### Pricing Configuration
Located in `lib/config.ts`:
- Base fee: $50.00
- Per mile: $2.00
- Fuel surcharge: 10% of subtotal

### HubSpot Pipeline Configuration

To map your actual HubSpot pipeline stages:
1. Log into HubSpot
2. Go to Settings > Objects > Deals > Pipelines
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

### Google Maps API Restrictions (Production)

For production security:
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click on your API key
3. Under "Application restrictions": select "HTTP referrers"
4. Add: `https://your-app.vercel.app/*`

## 📋 API Routes

### Core Endpoints
- `POST /api/quote` → creates customer + quote with pricing
- `POST /api/checkout` → creates Stripe checkout session
- `POST /api/stripe/webhook` → processes Stripe webhooks, creates orders
- `GET, POST /api/drivers` → manage drivers
- `POST /api/orders/assign` → assigns driver to order
- `PATCH /api/orders/:orderId/status` → updates order status

## 🔒 Security & Access Control

### User Roles
- **ANONYMOUS** - Public users (quote requests only)
- **RECIPIENT** - Authenticated customers (view own orders/tracking)
- **DRIVER** - Delivery drivers (manage assigned orders, update status)
- **DISPATCHER** - Operations staff (full order management, driver assignment)
- **ADMIN** - System administrators (full access, user management)

### Security Features
- Row Level Security (RLS) with role-based policies for all tables
- Service role key for secure server-side operations
- Webhook signature verification
- Input validation with Zod schemas
- Rate limiting on API endpoints
- Audit logging for all operations

## 🛠 Troubleshooting

### Common Issues

**Google Maps not loading:**
- Verify API key is set and Places API is enabled
- Check API key restrictions in Google Cloud Console

**Authentication issues:**
- Verify Supabase project URL and keys are correct
- Check redirect URLs in Supabase and OAuth providers
- Ensure users table has correct role assignments

**Stripe webhook failures:**
- Verify webhook URL matches your domain
- Check STRIPE_WEBHOOK_SECRET matches webhook endpoint secret
- Review Vercel function logs for detailed errors

**Database connection issues:**
- Verify Supabase credentials in environment variables
- Check RLS policies allow service role access
- Review Supabase logs for connection errors

## 📞 Support

For technical issues:
- Check the [main README](./README.md) for comprehensive documentation
- Review Vercel function logs for runtime errors
- Check Supabase logs for database issues
- Verify all environment variables are correctly set

**Need Help?** The README.md contains comprehensive documentation and troubleshooting guides.