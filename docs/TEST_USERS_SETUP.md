# Test Users Setup Guide

This guide provides step-by-step instructions for creating and using master test users to properly test all roles and features in the Preferred Solutions Transport platform.

## Overview

The platform has **four distinct user roles**, each with different access levels and interfaces:

1. **Admin** - Full system access, can manage users, view all integrations
2. **Dispatcher** - Manages orders, assigns drivers, views HubSpot/Stripe data
3. **Driver** - Views assigned orders, updates delivery status, captures proof of delivery
4. **Customer/Recipient** - Places orders, tracks deliveries, views payment history

## Prerequisites

- Access to your Supabase project dashboard
- Admin access to Supabase Auth
- Supabase SQL Editor access

---

## Step 1: Create Auth Users in Supabase Dashboard

### 1.1 Access Supabase Auth

1. Log in to your Supabase project at https://app.supabase.com
2. Navigate to **Authentication** → **Users** in the left sidebar
3. Click **Add user** button

### 1.2 Create Each Test User

Create the following auth users (**use these exact email addresses** for the seed script to work):

#### Admin User

- **Email:** `admin@test.preferredsolutions`
- **Password:** Choose a secure password (e.g., `TestAdmin123!`)
- **Auto Confirm:** ✅ Yes (check this box)
- Click **Create user**

#### Dispatcher User

- **Email:** `dispatcher@test.preferredsolutions`
- **Password:** Choose a secure password (e.g., `TestDispatch123!`)
- **Auto Confirm:** ✅ Yes
- Click **Create user**

#### Driver User

- **Email:** `driver@test.preferredsolutions`
- **Password:** Choose a secure password (e.g., `TestDriver123!`)
- **Auto Confirm:** ✅ Yes
- Click **Create user**

#### Customer User

- **Email:** `customer@test.preferredsolutions`
- **Password:** Choose a secure password (e.g., `TestCustomer123!`)
- **Auto Confirm:** ✅ Yes
- Click **Create user**

> **Important:** Make sure to check **"Auto Confirm"** so users don't need email verification.

---

## Step 2: Run the Test Data Seed Script

### 2.1 Access SQL Editor

1. In Supabase Dashboard, navigate to **SQL Editor** in the left sidebar
2. Click **New query** button

### 2.2 Run the Seed Script

1. Open the file `supabase/seeds/complete_test_data.sql` from your local repository
2. Copy the **entire contents** of the file
3. Paste into the SQL Editor in Supabase
4. Click **Run** button (or press `Cmd/Ctrl + Enter`)

### 2.3 Verify Success

You should see output like:

```
=== Test Data Created Successfully ===
Users: 4
Customers: 4
Drivers: 4
Quotes: 3
Orders: 6
```

If you see errors, check that:

- All four auth users were created with the correct email addresses
- You're using the exact email format: `role@test.preferredsolutions`
- The `consolidated-schema.sql` has been run previously

---

## Step 3: Test User Credentials

### Login Credentials

| Role           | Email                                | Password (you set) | Access Level        |
| -------------- | ------------------------------------ | ------------------ | ------------------- |
| **Admin**      | `admin@test.preferredsolutions`      | `TestAdmin123!`    | Full system access  |
| **Dispatcher** | `dispatcher@test.preferredsolutions` | `TestDispatch123!` | Order management    |
| **Driver**     | `driver@test.preferredsolutions`     | `TestDriver123!`   | Delivery operations |
| **Customer**   | `customer@test.preferredsolutions`   | `TestCustomer123!` | Order tracking      |

> **Note:** Use the passwords you set when creating the auth users in Step 1.2

---

## Step 4: What Each User Should See

### Admin Dashboard (`/admin`)

**Login as:** `admin@test.preferredsolutions`

**Should see:**

- System overview with statistics
- All users list (4 test users)
- All drivers (4 drivers including Test Driver)
- All orders (6 orders across various statuses)
- Integration health status
- Audit logs

**Test actions:**

- View user management interface
- Check system health dashboard
- Review integration statuses (HubSpot, Stripe, Google Maps)
- Export order data

### Dispatcher Dashboard (`/dispatcher`)

**Login as:** `dispatcher@test.preferredsolutions`

**Should see:**

- Dispatch queue with orders ready for assignment
- Order #301: ReadyForDispatch (not assigned)
- Order #302: Assigned to Test Driver
- Order #303: InTransit (Alice Martinez)
- Fleet map with driver locations
- HubSpot sync metadata for orders

**Test actions:**

- Assign Order #301 to a driver
- View HubSpot metadata for an order
- Check payment status in order details
- Use the live fleet map
- Filter and search orders

### Driver Interface (`/driver`)

**Login as:** `driver@test.preferredsolutions`

**Should see:**

- Orders assigned to "Test Driver"
- Order #302 (Assigned status)
- Order #306 (Accepted status)
- Driver profile with vehicle details
- Order route map

**Test actions:**

- Accept an assigned order
- Update order status (PickedUp → InTransit → Delivered)
- Capture proof of delivery (signature + photos)
- View order route on map
- Update availability status

### Customer Dashboard (`/customer/dashboard`)

**Login as:** `customer@test.preferredsolutions`

**Should see:**

- Active orders for Test Customer
- Order #301 (ReadyForDispatch)
- Order #306 (Accepted by Test Driver)
- Past order #304 (Delivered)
- Order history table

**Test actions:**

- Track active order on live map
- View order details
- See payment history (if implemented)
- Request new quote

---

## Step 5: Testing Integration Touchpoints

### HubSpot Integration

**Where to see it:**

- **Dispatcher:** Click "HubSpot Details" button on any order
  - Shows: Deal ID, sync status, last sync time
  - Orders have mock deal IDs like `test_deal_001`

**Test:**

1. Log in as dispatcher
2. Click on Order #301
3. Look for HubSpot metadata dialog
4. Verify deal ID is shown
5. Check sync status

### Stripe Integration

**Where to see it:**

- **Dispatcher:** Order details show payment status
  - Payment Intent IDs like `pi_test_ready_001`
- **Customer:** Payment history page (if implemented)
- **Admin:** Financial dashboard

**Test:**

1. Log in as dispatcher
2. View order details
3. Check for Stripe payment intent ID
4. Verify payment status badge

### Google Maps Integration

**Where to see it:**

- **Dispatcher:** Fleet map showing all active drivers
- **Driver:** Route map for assigned orders
- **Customer:** Live tracking map

**Test:**

1. Log in as dispatcher
2. Navigate to Map view
3. See driver locations (Test Driver, Alice Martinez, Bob Williams)
4. Click on an active order to see route

---

## Step 6: Resetting Test Data

If you need to reset test data (e.g., after testing):

### Option 1: Partial Reset (Keep Users)

Run this SQL to clear orders/quotes but keep users:

```sql
DELETE FROM public.driver_locations WHERE driver_id::text LIKE '00000000%';
DELETE FROM public.dispatch_events WHERE source = 'test_seed';
DELETE FROM public.orders WHERE id::text LIKE '00000000%';
DELETE FROM public.quotes WHERE id::text LIKE '00000000%';
```

Then re-run `complete_test_data.sql` from Step 5.2 onwards.

### Option 2: Full Reset (Including Users)

1. Delete auth users from Supabase Dashboard (Authentication → Users)
2. Run the cleanup section in `complete_test_data.sql` (uncomment lines)
3. Start from Step 1 again

---

## Troubleshooting

### "User already exists" error

**Solution:** The auth user was already created. Skip to Step 2.

### "No data visible after login"

**Possible causes:**

1. Seed script wasn't run → Run `complete_test_data.sql`
2. Wrong email format → Verify emails match exactly
3. RLS policies blocking access → Check Supabase logs

### "Access denied" when navigating to role dashboard

**Possible causes:**

1. User role not set correctly → Re-run seed script Step 1
2. Middleware blocking access → Check browser console for errors
3. Session expired → Log out and log in again

### Can't see integration metadata

**For HubSpot:**

- Check that orders have `hubspot_metadata` populated
- View in dispatcher interface, not customer
- Some orders may not have HubSpot data (by design)

**For Stripe:**

- Verify `stripe_payment_intent_id` is set on orders
- Check that payment status is shown in order details

---

## Next Steps

After setting up test users:

1. **Test the complete user flow:**
   - Customer requests quote → pays → order created
   - Dispatcher assigns to driver
   - Driver accepts → picks up → delivers
   - Customer tracks throughout

2. **Test integration features:**
   - HubSpot sync controls
   - Stripe payment visibility
   - Live tracking maps

3. **Explore admin tools:**
   - User management
   - System health monitoring
   - Audit logs

4. **Try error scenarios:**
   - Failed payment
   - Unassigned order timeout
   - Driver location not updating

---

## Security Notes

⚠️ **Important:** These are **test users only** and should:

- NEVER be used in production
- Use the exact domain `@test.preferredsolutions`
- Be deleted before going live
- Have obvious test passwords that you document

For production:

- Use real email addresses
- Implement proper user onboarding
- Require email verification
- Use strong password policies
- Enable 2FA for admin/dispatcher roles

---

## Support

If you encounter issues:

1. Check Supabase logs (Logs → Postgres)
2. Review browser console for errors
3. Verify environment variables are set (`.env.local`)
4. Ensure all migrations have been run
5. Check that you're using the latest schema (`consolidated-schema.sql`)

For development questions, see `CONTRIBUTING.md` and `TESTING.md`.
