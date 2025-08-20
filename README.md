# Delivery Platform - Milestone 1

A modern delivery platform built with Next.js, Supabase, and Stripe. This is Milestone 1 focusing on the core quote-to-payment-to-dispatch workflow.

## Features

- **Customer Quote Form**: Submit delivery requests with distance-based pricing
- **Stripe Integration**: Secure payment processing with test mode
- **Order Management**: Automatic order creation after successful payment
- **Dispatcher Queue**: Real-time view of orders ready for dispatch
- **Webhook Processing**: Stripe webhook verification and order processing

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Payments**: Stripe Checkout + Webhooks
- **Deployment**: Vercel-ready configuration

## Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp env.example .env.local
```

Fill in your environment variables:

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
3. Set up a webhook endpoint (see Webhook Setup below)

### 2. Database Setup

Run the schema in your Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase/schema.sql
```

Or run the file directly:
```bash
# If you have Supabase CLI installed
supabase db reset
```

### 3. Stripe Webhook Setup

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

For local development:
```bash
# Install Stripe CLI and forward events
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 4. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The platform uses these core tables:

### `customers`
- Customer information (name, email, phone)
- Upserted by email for repeat customers

### `quotes`
- Delivery requests with pricing calculations
- Includes pickup/dropoff addresses and distance
- Expires after 24 hours

### `orders`
- Created after successful Stripe payment
- Links to quote and customer
- Tracks Stripe payment IDs

### `dispatch_events`
- Audit trail for order lifecycle events
- Used for webhook processing and system events

### `webhook_events`
- Ensures idempotent webhook processing
- Prevents duplicate order creation

## API Routes

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

### `POST /api/checkout`
Creates a Stripe Checkout session for a quote.

**Request:**
```json
{
  "quoteId": "uuid-of-quote"
}
```

### `POST /api/stripe/webhook`
Processes Stripe webhooks (checkout.session.completed).
- Verifies webhook signature
- Creates order with status 'ReadyForDispatch'
- Logs dispatch event

## Testing the Flow

### Complete End-to-End Test

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

### Pricing Calculation

Current pricing structure (configured in `lib/config.ts`):
- Base fee: $50.00
- Per mile: $2.00
- Fuel surcharge: 10% of subtotal
- **Example**: 5 miles = $50 + ($2 × 5) + ($60 × 0.10) = $66.00

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The `VERCEL_URL` environment variable is automatically set by Vercel and used for Stripe redirect URLs.

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:
- Use production Stripe keys (not test keys)
- Use production Supabase project
- Set up production webhook endpoint

## Milestone 1 Limitations

The following features are intentionally limited for M1:

### ✅ Implemented
- Customer quote submission (no auth required)
- Distance-based pricing calculation
- Stripe test payment processing
- Order creation via webhook
- Dispatcher queue (read-only view)

### 🚧 Coming in Future Milestones
- **Authentication**: Driver login and customer accounts
- **Google Maps**: Automatic distance calculation
- **Driver Actions**: Order assignment and status updates
- **Notifications**: Email/SMS confirmations
- **Integrations**: Make.com and HubSpot automation
- **Enhanced Security**: Proper RLS policies and permissions

## Development

### Code Quality
- TypeScript for type safety
- Zod for runtime validation
- ESLint and Prettier for code formatting
- Tailwind CSS for consistent styling

### Security Notes
- RLS is enabled but permissive for M1
- Service role key used for API operations
- Webhook signature verification implemented
- Input validation on all API endpoints

## Troubleshooting

### Common Issues

**Webhook not firing locally:**
```bash
# Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Database connection errors:**
- Verify Supabase URL and keys
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

### Logs and Debugging

- Supabase: Check logs in Supabase dashboard
- Stripe: Monitor webhook attempts in Stripe dashboard
- Vercel: Check function logs in Vercel dashboard
- Local: Check browser console and terminal output

## Contributing

This is Milestone 1 of a larger project. Future milestones will add:
- Driver authentication and mobile app
- Real-time tracking and notifications
- Advanced routing and optimization
- Integration with external systems
- Enhanced security and permissions

For questions or issues, check the troubleshooting section or review the code comments for implementation details.
