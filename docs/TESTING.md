# Testing Guide

Comprehensive testing guide for the Preferred Solutions Transport platform.

## Table of Contents

1. [Test Users Setup](#test-users-setup)
2. [Testing by Role](#testing-by-role)
3. [Integration Testing](#integration-testing)
4. [API Testing](#api-testing)
5. [End-to-End User Flows](#end-to-end-user-flows)
6. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Test Users Setup

Before testing, set up master test users by following [`TEST_USERS_SETUP.md`](./TEST_USERS_SETUP.md).

**Quick Reference:**

- Admin: `admin@test.preferredsolutions`
- Dispatcher: `dispatcher@test.preferredsolutions`
- Driver: `driver@test.preferredsolutions`
- Customer: `customer@test.preferredsolutions`

---

## Testing by Role

### Admin Dashboard Testing

**Login:** `admin@test.preferredsolutions`  
**URL:** `/admin`

**Test Checklist:**

- [ ] **Overview Tab**
  - [ ] System statistics cards display correctly
  - [ ] Health status shows all integrations
    - [ ] Supabase: Connected with table counts
    - [ ] Stripe: Connected with balance info
    - [ ] HubSpot: Connected with contact count
    - [ ] Google Maps: Connected
  - [ ] Refresh button updates health status

- [ ] **Users Tab**
  - [ ] All test users are listed
  - [ ] Can create new user
    - [ ] Email validation
    - [ ] Role selection (admin, dispatcher, driver, customer)
    - [ ] Password field
  - [ ] Can edit user role
  - [ ] Can ban user
  - [ ] Can delete user
  - [ ] Status badges show correctly (Active/Banned)

- [ ] **Drivers Tab**
  - [ ] All drivers listed with vehicle details
  - [ ] Active orders count shows correctly

- [ ] **Orders Tab**
  - [ ] All orders visible regardless of status
  - [ ] Can filter and search orders

- [ ] **Logs & Reports Tab**
  - [ ] Can fetch dispatch events
  - [ ] Filters work (event type, order ID, date range)
  - [ ] Export to CSV works

### Dispatcher Dashboard Testing

**Login:** `dispatcher@test.preferredsolutions`  
**URL:** `/dispatcher`

**Test Checklist:**

- [ ] **Dispatch Queue**
  - [ ] Orders in ReadyForDispatch status are visible
  - [ ] Can assign driver to order
  - [ ] Smart driver suggestions appear
  - [ ] Real-time updates when orders change

- [ ] **Order Details**
  - [ ] Payment status badge shows
  - [ ] Stripe payment link clickable
  - [ ] HubSpot Details button available
- [ ] **HubSpot Details Dialog**
  - [ ] Metadata displays correctly
  - [ ] "Sync Now" button works
  - [ ] Shows deal ID and sync status
  - [ ] Payment Information card shows Stripe links

- [ ] **Fleet Map**
  - [ ] Driver locations displayed
  - [ ] Active orders shown on map
  - [ ] Can click orders for details

- [ ] **Search & Filter**
  - [ ] Search by customer, address, driver works
  - [ ] Status filter works

### Driver Interface Testing

**Login:** `driver@test.preferredsolutions`  
**URL:** `/driver`

**Test Checklist:**

- [ ] **My Orders**
  - [ ] Shows only orders assigned to Test Driver
  - [ ] Order statuses display correctly
  - [ ] Can accept assigned orders

- [ ] **Order Actions**
  - [ ] Can update status (Accepted → PickedUp → InTransit → Delivered)
  - [ ] Route map displays correctly
  - [ ] Customer contact info visible

- [ ] **Proof of Delivery**
  - [ ] Signature pad works
  - [ ] Photo capture works
  - [ ] Can submit POD
  - [ ] Delivery notes field works

- [ ] **Profile**
  - [ ] Vehicle details editable
  - [ ] Phone number editable
  - [ ] Total deliveries count shows

### Customer Dashboard Testing

**Login:** `customer@test.preferredsolutions`  
**URL:** `/customer/dashboard`

**Test Checklist:**

- [ ] **Active Orders**
  - [ ] Orders for Test Customer visible
  - [ ] Live tracking link works
  - [ ] Status updates in real-time

- [ ] **Payment History**
  - [ ] Navigate to `/customer/payment-history`
  - [ ] Payment history table shows all transactions
  - [ ] Payment status badges display correctly
  - [ ] Receipt download buttons work (for paid orders)
  - [ ] Track order links work
  - [ ] Search functionality works

- [ ] **Order Tracking**
  - [ ] Live tracking map shows driver location
  - [ ] Route polyline displays
  - [ ] ETA shows (if driver assigned)

---

## Integration Testing

### HubSpot Integration

**Prerequisites:**

- `HUBSPOT_PRIVATE_APP_TOKEN` set in `.env.local`
- HubSpot pipeline configured

**Test Steps:**

1. **Automatic Sync** (On Payment)
   - Request quote as customer
   - Complete Stripe checkout
   - Check dispatcher dashboard
   - Verify order has HubSpot metadata
   - Open HubSpot Details dialog
   - Confirm deal ID is present

2. **Manual Sync**
   - As dispatcher, open any order
   - Click "HubSpot Details"
   - Click "Sync Now" button
   - Verify success toast appears
   - Check HubSpot dashboard for deal

3. **Webhook Processing**
   - Update deal in HubSpot
   - Wait for webhook (or trigger manually)
   - Check order updates in dispatcher view

**What to Verify:**

- Contact created with customer email
- Deal created with correct amount
- Pipeline stage matches order status
- Custom properties populated

### Stripe Integration

**Prerequisites:**

- `STRIPE_SECRET_KEY` set
- Stripe webhook configured (for local: use Stripe CLI)

**Test Steps:**

1. **Payment Flow**
   - Request quote
   - Click "Continue to Payment"
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout
   - Verify redirect to thank-you page

2. **Payment History**
   - Log in as customer
   - Navigate to Payment History
   - Verify transaction appears
   - Click "Download Receipt"
   - Verify Stripe receipt opens

3. **Dispatcher Payment View**
   - Log in as dispatcher
   - View any paid order
   - Check Payment column shows "Paid" badge
   - Click "View in Stripe" link
   - Verify Stripe dashboard opens with correct payment

**What to Verify:**

- Payment intent created
- Order status updated to ReadyForDispatch
- Payment record in database
- Receipt URL available

### Google Maps Integration

**Prerequisites:**

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_API_KEY` set

**Test Steps:**

1. **Quote Form**
   - Go to `/quote`
   - Enter pickup address
   - Enter dropoff address
   - Verify autocomplete works
   - Submit quote
   - Verify distance calculated

2. **Fleet Map**
   - Log in as dispatcher
   - Navigate to Map tab
   - Verify driver locations show
   - Click on driver marker
   - Verify info window displays

3. **Live Tracking**
   - Log in as customer
   - Track an active order
   - Verify map shows route
   - Verify driver location updates

**What to Verify:**

- Address autocomplete functional
- Distance calculation accurate
- Maps render without errors
- Real-time location updates work

---

## API Testing

### Using the Test Script

Run the included API test script:

```bash
bash scripts/test-api.sh
```

This tests the complete flow: quote → checkout → webhook → order creation

### Manual API Testing

Use the following curl commands (replace `$API_URL` with your local/deployment URL):

#### 1. Create Quote

```bash
curl -X POST $API_URL/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "customerPhone": "(555) 123-4567",
    "pickupAddress": "123 Main St, New York, NY",
    "dropoffAddress": "456 Broadway, New York, NY",
    "distanceMi": 5.2,
    "weightLb": 50
  }'
```

#### 2. Create Checkout Session

```bash
curl -X POST $API_URL/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "QUOTE_ID_FROM_STEP_1"
  }'
```

#### 3. Assign Driver (requires auth)

```bash
curl -X POST $API_URL/api/orders/assign \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{
    "orderId": "ORDER_ID",
    "driverId": "DRIVER_ID"
  }'
```

---

## End-to-End User Flows

### Complete Order Flow

**Test the full customer journey:**

1. **Customer Requests Quote**
   - Go to `/quote` as anonymous user
   - Fill in pickup/dropoff addresses
   - Add weight
   - Submit quote
   - Verify pricing displayed

2. **Customer Pays**
   - Click "Continue to Payment"
   - Enter test card `4242 4242 4242 4242`
   - Complete Stripe checkout
   - Verify redirect to `/thank-you`
   - Check email for confirmation (if email configured)

3. **Order Appears for Dispatch**
   - Log in as dispatcher
   - Verify new order in queue
   - Status should be "ReadyForDispatch"
   - HubSpot metadata should exist

4. **Dispatcher Assigns Driver**
   - Select driver from dropdown
   - Click "Assign" button
   - Verify order moves to "Assigned" status
   - Check HubSpot for deal update

5. **Driver Accepts Order**
   - Log out, log in as driver
   - See assigned order
   - Click "Accept" button
   - Status changes to "Accepted"

6. **Driver Completes Delivery**
   - Update status to "PickedUp"
   - Update to "InTransit"
   - Arrive at destination
   - Capture proof of delivery:
     - Take signature
     - Upload photos
     - Add delivery notes
   - Submit POD
   - Status changes to "Delivered"

7. **Customer Views Delivery**
   - Log in as customer
   - View order history
   - Click on completed order
   - See proof of delivery
   - View photos and signature

### Multi-Tenant Testing

**Test tenant isolation:**

1. Create multiple test customers
2. Place orders from each
3. Log in as each customer
4. Verify they only see their own orders
5. Verify drivers only see assigned orders
6. Verify dispatchers see all orders

---

## Common Issues & Troubleshooting

### Issue: "Order not appearing in dispatcher queue"

**Possible Causes:**

- Order status is not "ReadyForDispatch"
- Realtime subscription not connected
- RLS policy blocking access

**Solution:**

```sql
-- Check order status
SELECT id, status FROM orders WHERE id = 'ORDER_ID';

-- Manually set to ReadyForDispatch
UPDATE orders SET status = 'ReadyForDispatch' WHERE id = 'ORDER_ID';
```

### Issue: "HubSpot sync failing"

**Check:**

1. `HUBSPOT_PRIVATE_APP_TOKEN` is set
2. Token has correct scopes (contacts, deals)
3. Check browser console for errors
4. View response in Network tab

**Test HubSpot API manually:**

```bash
curl https://api.hubapi.com/crm/v3/objects/contacts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: "Payment not recording"

**Check:**

1. Stripe webhook is configured and delivered
2. `STRIPE_WEBHOOK_SECRET` matches webhook secret
3. Check `/api/admin/logs` for webhook events
4. Verify Stripe CLI is running (local dev)

**Stripe CLI Command:**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Issue: "Driver location not updating"

**Check:**

1. Driver has granted location permissions
2. Location update API is being called
3. Check `driver_locations` table in database
4. Verify realtime subscriptions connected

**Manual Location Update:**

```sql
UPDATE driver_locations
SET latitude = 40.7580, longitude = -73.9855, updated_at = NOW()
WHERE driver_id = 'DRIVER_ID';
```

### Issue: "Test data not appearing"

**Solution:**

1. Verify you ran `complete_test_data.sql`
2. Check auth users were created first
3. Confirm emails match exactly: `role@test.preferredsolutions`
4. Re-run seed script if needed

---

## Performance Testing

### Load Testing Checklist

- [ ] Test with 100+ orders in dispatch queue
- [ ] Test with 50+ drivers on map
- [ ] Test real-time updates with multiple browser windows
- [ ] Test concurrent order assignments
- [ ] Monitor database query performance

### Tools

- **Database queries:** Use Supabase Dashboard → Logs → Postgres
- **API performance:** Check Vercel Analytics
- **Frontend performance:** Use Chrome DevTools Lighthouse

---

## Security Testing

### Authentication Testing

- [ ] Verify unauthenticated users cannot access protected routes
- [ ] Test role-based access control
  - [ ] Customer cannot access `/dispatcher`
  - [ ] Driver cannot access `/admin`
  - [ ] Dispatcher cannot access admin-only features
- [ ] Test session expiration and renewal

### Data Privacy Testing

- [ ] Customer A cannot see Customer B's orders
- [ ] Driver cannot see unassigned orders' customer details
- [ ] RLS policies enforce data isolation

---

## Regression Testing

After making changes, always test:

1. **Quote → Payment → Order** flow still works
2. **Order Assignment** still functions
3. **Real-time updates** still trigger
4. **HubSpot sync** still executes
5. **Payment history** still loads

---

## Test Data Management

### Reset Test Data

```sql
-- Run in Supabase SQL Editor
DELETE FROM driver_locations WHERE driver_id::text LIKE '00000000%';
DELETE FROM dispatch_events WHERE source = 'test_seed';
DELETE FROM orders WHERE id::text LIKE '00000000%';
DELETE FROM quotes WHERE id::text LIKE '00000000%';
```

Then re-run `supabase/seeds/complete_test_data.sql`

### Create Additional Test Data

Add to `complete_test_data.sql` or create manually:

```sql
INSERT INTO orders (id, customer_id, price_total, status, ...)
VALUES (...);
```

---

## Automated Testing (Future)

**Recommended test frameworks:**

- **Unit tests:** Jest + React Testing Library
- **Integration tests:** Supertest for APIs
- **E2E tests:** Playwright or Cypress
- **Database tests:** PostgreSQL TAP

**Test coverage priorities:**

1. Authentication flows
2. Order lifecycle
3. Payment processing
4. HubSpot sync
5. Real-time subscriptions

---

## CI/CD Testing

The GitHub Action `.github/workflows/validate-deps.yml` runs on every PR to ensure:

- Dependencies are in sync
- No security vulnerabilities
- Lock file is valid

---

## Monitoring in Production

### Health Checks

Monitor these endpoints:

- `/api/health` - Basic health check
- `/api/admin/health` - Detailed system status (admin only)
- `/api/admin/health/integrations` - Integration status
- `/api/admin/health/database` - Database metrics

### Logging

- **Dispatch Events:** All logged to `dispatch_events` table
- **Audit Logs:** User actions logged to `audit_logs` table (after migration)
- **Webhook Events:** Logged to `webhook_events` and `hubspot_webhook_events`

### Alerts (Recommended)

Set up alerts for:

- Failed HubSpot syncs
- Failed payment intents
- Unassigned orders > 1 hour old
- Driver location not updating > 30 minutes
- API error rate > 5%

---

## Best Practices

1. **Use test Stripe cards** - never use real payment methods
2. **Keep test data clearly labeled** with `@test.preferredsolutions` domain
4. **Reset test data regularly** to ensure clean state
5. **Document any issues** you encounter for future reference

---

## Need Help?

- Check `CONTRIBUTING.md` for development workflows
- Check `TEST_USERS_SETUP.md` for user setup
- Check `README.md` for environment configuration
- Check Supabase logs for database errors
- Check browser console for frontend errors
- Check Vercel logs for deployment issues
