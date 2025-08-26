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

Fill in your **actual** environment variables in `.env.local`:

#### Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your keys:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep secret!)

#### Stripe Setup
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Use test mode keys from your Stripe Dashboard:
   - `STRIPE_SECRET_KEY`: Secret key (sk_test_...)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Publishable key (pk_test_...)
3. Set up webhook endpoint (see Webhook Setup below)

#### HubSpot Setup (Optional)
1. Create a Private App in your HubSpot portal
2. Grant scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.deals.write`
3. Copy the Private App Access Token to `HUBSPOT_PRIVATE_APP_TOKEN`

### 2. Database Setup

Run the schema in your Supabase SQL editor:

1. Copy and paste the contents of `supabase/schema.sql`
2. Run the query to create all tables and policies
3. Copy and paste the contents of `supabase/migrations/20250819_hardening.sql`
4. Run the hardening migration (ignore "already exists" warnings)

Or use Supabase CLI:
```bash
# If you have Supabase CLI installed
supabase db reset
```

### 3. Stripe Webhook Setup

For local development:
```bash
# Install Stripe CLI and forward events
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
```

For production:
1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing the Complete Flow

### Automated Test Script

Run the provided test script for quick API validation:
```bash
# Install jq for JSON parsing (optional but recommended)
brew install jq  # macOS

# Run the test
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

### Manual End-to-End Test

1. **Submit Quote**:
   - Go to `/quote`
   - Fill form with test data (use any distance > 0)
   - Click "Continue to Payment"

2. **Test Payment**:
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date and CVC
   - Complete payment

3. **Verify Order Creation**:
   - Check Supabase `orders` table for new record
   - Status should be 'ReadyForDispatch'
   - Visit `/dispatcher` to see the order listed
   - Check HubSpot for new contact and deal (if enabled)

## 💰 Pricing Configuration

Current pricing structure (configured in `lib/config.ts`):
- **Base fee**: $50.00
- **Per mile**: $2.00  
- **Fuel surcharge**: 10% of subtotal
- **Example**: 5 miles = $50 + ($2 × 5) + ($60 × 0.10) = **$66.00**

## 🗃 Database Schema

### Core Tables

**`customers`**
- Customer information (name, email, phone)
- Upserted by email for repeat customers

**`quotes`**
- Delivery requests with pricing calculations
- Pickup/dropoff addresses and distance
- Expires after 24 hours
- Status tracking

**`orders`**
- Created after successful Stripe payment
- Links to quote and customer
- Tracks Stripe payment IDs
- Status: Draft → AwaitingPayment → ReadyForDispatch → Assigned → Accepted → PickedUp → InTransit → Delivered

**`dispatch_events`**
- Complete audit trail for order lifecycle
- System events and webhook processing
- Actor tracking (system, dispatcher, driver)

**`webhook_events`**
- Ensures idempotent webhook processing
- Prevents duplicate order creation

### Order Status Flow

```
ReadyForDispatch → Assigned → Accepted → PickedUp → InTransit → Delivered
                                    ↓
                              (Can be Canceled at any stage)
```

## 🔌 API Routes

### `POST /api/quote`
Creates a customer and quote with pricing calculation.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "phone": "+1234567890",
  "pickupAddress": "123 Main St",
  "dropoffAddress": "456 Oak Ave",
  "distanceMi": 5.2,
  "weightLb": 10
}
```

**Response:**
```json
{
  "quoteId": "uuid-of-quote",
  "pricing": {
    "baseFee": 50,
    "perMileRate": 2,
    "distanceMi": 5.2,
    "subtotal": 60.4,
    "fuel": 6.04,
    "total": 66.44
  }
}
```

### `POST /api/checkout`
Creates a Stripe Checkout session for a quote.

**Request:**
```json
{
  "quoteId": "uuid-of-quote"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/pay/..."
}
```

### `POST /api/stripe/webhook`
Processes Stripe webhooks (checkout.session.completed).
- Verifies webhook signature
- Creates order with status 'ReadyForDispatch'
- Logs dispatch event
- Syncs to HubSpot (if configured)

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The `VERCEL_URL` environment variable is automatically set by Vercel.

### Environment Variables for Production

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (production key: sk_live_...)
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (production key: pk_live_...)

**Optional:**
- `HUBSPOT_PRIVATE_APP_TOKEN`

## 🔒 Security & Best Practices

### Current Security (M1)
- Row Level Security (RLS) enabled with permissive policies
- Service role key used for API operations
- Webhook signature verification implemented
- Input validation on all API endpoints
- Environment variables for secrets

### Coming in M2+
- User authentication and session management
- Granular RLS policies by user role
- API rate limiting
- Enhanced data encryption

## 🐛 Troubleshooting

### Common Issues

**Webhook not firing locally:**
```bash
# Ensure Stripe CLI is running
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook secret to .env.local and restart your dev server
```

**Database connection errors:**
- Verify Supabase URL and keys in `.env.local`
- Check that RLS policies allow the operations
- Ensure service role key is set for API routes

**Payment not creating order:**
- Check webhook endpoint is accessible
- Verify webhook secret matches Stripe
- Check Supabase logs for errors
- Ensure quote exists and hasn't expired

**Orders not showing in dispatcher:**
- Verify order status is 'ReadyForDispatch'
- Check RLS policies allow anonymous reads
- Look for JavaScript console errors

**HubSpot sync not working:**
- Verify `HUBSPOT_PRIVATE_APP_TOKEN` is set
- Check that Private App has required scopes
- Monitor server logs for HubSpot API errors

### Debugging Resources

- **Supabase**: Check logs in Supabase dashboard
- **Stripe**: Monitor webhook attempts in Stripe dashboard  
- **Vercel**: Check function logs in Vercel dashboard
- **Local**: Check browser console and terminal output

## 🗺 Roadmap

### Milestone 2: Driver Management
- Driver authentication system
- Mobile-optimized driver interface
- Order assignment by dispatchers
- Real-time status updates
- Push notifications

### Milestone 3: Advanced Features
- Google Maps integration for automatic distance calculation
- Real-time GPS tracking
- Photo upload for proof of delivery
- Customer notifications (SMS/Email)
- Route optimization

### Milestone 4: Business Intelligence
- Admin dashboard with analytics
- Revenue and performance reporting
- Customer management system
- Pricing rule management
- Integration with accounting systems

## 🤝 Contributing

This project is designed with scalability and maintainability in mind:

- **TypeScript** for type safety
- **Zod** for runtime validation
- **ESLint** and **Prettier** for code quality
- **Tailwind CSS** for consistent styling
- **Supabase** for realtime capabilities
- **Modular architecture** for easy feature addition

For questions or issues, check the troubleshooting section or review the code comments for implementation details.

---

**Current Version**: Milestone 1 (Production Ready)  
**Next Release**: Driver Management (M2)