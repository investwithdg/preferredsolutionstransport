# HubSpot Webhook Implementation - Bi-Directional Sync

## Overview

This implementation establishes a **hybrid data model** where HubSpot and Supabase work together:
- **HubSpot** = Source of truth for CRM data (contacts, deals, sales team edits)
- **Supabase** = Source of truth for operational data (real-time tracking, order status, GPS)

## What Was Implemented

### 1. Webhook Infrastructure

**Files Created:**
- `lib/hubspot/webhook.ts` - Signature verification and payload parsing utilities
- `lib/hubspot/reverse-mappings.ts` - Maps HubSpot properties back to Supabase columns
- `app/api/hubspot/webhook/route.ts` - Webhook endpoint that receives HubSpot events

**How It Works:**
- HubSpot sends webhook notifications when contacts or deals are updated
- Webhook signature is verified using SHA-256 HMAC with your app secret
- Events are stored in `hubspot_webhook_events` table for idempotency (prevents duplicate processing)
- Property changes are mapped to Supabase columns and updates are applied

### 2. Database Migrations

**Files Created:**
- `supabase/migrations/003_add_hubspot_webhook_events.sql` - Event audit trail table
- `supabase/migrations/004_add_hubspot_deal_id_to_orders.sql` - Links orders/customers to HubSpot

**Schema Changes:**
```sql
-- New table for webhook event tracking
hubspot_webhook_events (
  id, event_id, event_type, object_type, object_id, 
  portal_id, occurred_at, processed_at, payload, created_at
)

-- New columns for bi-directional linking
orders.hubspot_deal_id
customers.hubspot_contact_id
```

### 3. Enhanced Sync Function

**Modified:** `lib/hubspot/client.ts`

The `syncOrderToHubSpot()` function now:
- Accepts an optional `supabaseClient` parameter
- Stores HubSpot deal ID back to the order record
- Stores HubSpot contact ID back to the customer record
- Enables future webhook events to find the correct Supabase records

### 4. Documentation

**Updated:**
- `env.example` - Added `HUBSPOT_WEBHOOK_SECRET` variable
- `REFERENCE.md` - Added comprehensive webhook setup guide

## Data Flow Diagram

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
       │                                  │
       │  6. Driver tracks in real-time   │
       │     (GPS coordinates)            │
       │  ◄───────────────────────────────┤
       │     (stays in Supabase only)     │
       │                                  │
```

## Setup Instructions

### 1. Run Database Migrations

Open Supabase SQL Editor and run these migrations in order:
```sql
-- First run: 003_add_hubspot_webhook_events.sql
-- Then run: 004_add_hubspot_deal_id_to_orders.sql
```

### 2. Configure Environment Variable

Add to your `.env.local`:
```env
HUBSPOT_WEBHOOK_SECRET=your_webhook_secret_from_hubspot
```

### 3. Set Up Webhook in HubSpot

1. Go to HubSpot → Settings → Integrations → Private Apps
2. Click your private app → Webhooks tab
3. Create subscription:
   - **URL**: `https://your-domain.com/api/hubspot/webhook`
   - **Events**: `contact.propertyChange`, `deal.propertyChange`
   - **Properties**: All or specific ones you want to monitor
4. Copy the webhook secret to your `.env.local`

### 4. Test the Integration

**Test webhook receipt:**
```bash
curl https://your-domain.com/api/hubspot/webhook
# Should return: {"message":"HubSpot webhook endpoint","configured":true}
```

**Test from HubSpot:**
1. Update a deal property in HubSpot (e.g., pickup address)
2. Check your app logs for "Updated order X from HubSpot deal Y"
3. Verify the change appears in your Supabase database

## What Syncs

### From App to HubSpot (Automatic)
- Customer contact info (email, name, phone)
- Order/deal creation
- Order status updates
- Driver assignments
- Delivery timestamps
- All custom properties mapped in `property-mappings.ts`

### From HubSpot to App (Via Webhooks)
- Contact name, email, phone changes
- Deal custom properties (addresses, instructions, etc.)
- **NOT synced**: Pipeline stages (read-only for visibility)
- **NOT synced**: Order status (app controls operational status)

## Architecture Benefits

✅ **No Polling** - Instant updates via webhooks instead of periodic API calls
✅ **Idempotent** - Duplicate webhooks are safely ignored
✅ **Audit Trail** - All webhook events stored for debugging
✅ **Selective Sync** - Only properties that changed are updated
✅ **Conflict Prevention** - Operational data stays in Supabase, CRM data in HubSpot

## Security

- **Signature Verification**: Every webhook is verified using SHA-256 HMAC
- **Event Deduplication**: Prevents replay attacks and race conditions
- **Service Role Access**: Webhook handler uses service role for Supabase updates
- **Rate Limiting**: Built into Next.js API routes (via Vercel)

## Monitoring & Debugging

**Check webhook events:**
```sql
SELECT * FROM hubspot_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check sync logs:**
```sql
SELECT * FROM dispatch_events 
WHERE source = 'hubspot' 
ORDER BY created_at DESC;
```

**Webhook endpoint health:**
```bash
GET /api/hubspot/webhook
# Returns configuration status
```

## Next Steps

1. **Run the migrations** in your Supabase database
2. **Add the webhook secret** to your environment variables
3. **Configure the webhook** in HubSpot's private app settings
4. **Test with a property change** in HubSpot
5. **Monitor logs** to verify sync is working

## Troubleshooting

**Webhook not receiving events:**
- Verify `HUBSPOT_WEBHOOK_SECRET` is set correctly
- Check webhook URL is accessible from internet (not localhost)
- Verify webhook is active in HubSpot settings

**Events received but not syncing:**
- Check `hubspot_webhook_events` table for error records
- Verify `hubspot_deal_id` / `hubspot_contact_id` columns exist
- Check dispatch_events logs for sync errors

**Signature verification failing:**
- Ensure webhook secret matches exactly
- Check that request body is passed as raw string to verifier
- Verify HubSpot signature header is being read correctly

## Files Reference

**Core Implementation:**
- `lib/hubspot/webhook.ts` - Webhook utilities
- `lib/hubspot/reverse-mappings.ts` - Property mapping logic
- `app/api/hubspot/webhook/route.ts` - Webhook endpoint
- `lib/hubspot/client.ts` - Enhanced sync function

**Database:**
- `supabase/migrations/003_add_hubspot_webhook_events.sql`
- `supabase/migrations/004_add_hubspot_deal_id_to_orders.sql`

**Configuration:**
- `env.example` - Environment variable template
- `REFERENCE.md` - Setup and configuration guide



