# Role-Based Data Access Test Plan

## Overview

This document provides step-by-step instructions to verify that each user role sees only the appropriate data, particularly the filtered HubSpot metadata.

## Prerequisites

1. Database with the updated schema (including new functions and views)
2. Test users for each role (driver, dispatcher, admin, customer/recipient)
3. At least one order with HubSpot metadata containing:
   ```json
   {
     "specialDeliveryInstructions": "Handle with care - fragile items",
     "recurringFrequency": "weekly",
     "rushRequested": true
   }
   ```

## Test Setup

### 1. Apply Database Changes

```bash
# Apply the consolidated schema
psql $DATABASE_URL -f supabase/consolidated-schema.sql

# Verify functions exist
psql $DATABASE_URL -c "SELECT proname FROM pg_proc WHERE proname IN ('get_minimal_hubspot_metadata', 'validate_hubspot_metadata');"

# Verify view exists
psql $DATABASE_URL -c "SELECT * FROM information_schema.views WHERE table_name = 'orders_with_filtered_metadata';"
```

### 2. Create Test Order with Metadata

```sql
-- Insert test order with HubSpot metadata
INSERT INTO orders (
  customer_id,
  order_number,
  recipient_name,
  status,
  hubspot_metadata
) VALUES (
  (SELECT id FROM customers LIMIT 1),
  'TEST-001',
  'Test Recipient',
  'pending',
  '{
    "specialDeliveryInstructions": "Handle with care - fragile items",
    "recurringFrequency": "weekly",
    "rushRequested": true,
    "internalField": "Should not be visible to non-admins"
  }'::jsonb
);
```

## Test Cases

### Test 1: Driver Role

**Login as**: Driver user
**Expected behavior**:

1. Navigate to driver dashboard
2. View order details
3. Should see ONLY:
   - All operational fields (addresses, times, customer info)
   - Special delivery instructions: "Handle with care - fragile items"
   - Should NOT see: recurring frequency, rush requested, internal fields

**Verification query** (run as driver):

```sql
SELECT hubspot_metadata
FROM orders_with_filtered_metadata
WHERE order_number = 'TEST-001';
-- Expected: {"specialDeliveryInstructions": "Handle with care - fragile items"}
```

### Test 2: Customer/Recipient Role

**Login as**: Customer user
**Expected behavior**:

1. Navigate to customer dashboard
2. View own order
3. Should see ONLY:
   - Basic order info (status, delivery time)
   - Driver contact info
   - Special delivery instructions
   - Should NOT see: recurring frequency, rush requested

**Verification query** (run as customer):

```sql
SELECT hubspot_metadata
FROM orders_with_filtered_metadata
WHERE order_number = 'TEST-001';
-- Expected: {"specialDeliveryInstructions": "Handle with care - fragile items"}
```

### Test 3: Dispatcher Role

**Login as**: Dispatcher user  
**Expected behavior**:

1. Navigate to dispatcher dashboard
2. View any order
3. Should see:
   - All operational fields
   - Special delivery instructions
   - Recurring frequency: "weekly"
   - Rush requested: true (highlighted)
   - Should NOT see: internal fields

**Verification query** (run as dispatcher):

```sql
SELECT hubspot_metadata
FROM orders_with_filtered_metadata
WHERE order_number = 'TEST-001';
-- Expected: {
--   "specialDeliveryInstructions": "Handle with care - fragile items",
--   "recurringFrequency": "weekly",
--   "rushRequested": true
-- }
```

### Test 4: Admin Role

**Login as**: Admin user
**Expected behavior**:

1. Navigate to admin dashboard
2. View any order
3. Should see:
   - All operational fields
   - ALL HubSpot metadata (unfiltered)
   - "View in HubSpot" button
   - "Fetch Latest Data" option

**Verification query** (run as admin):

```sql
SELECT hubspot_metadata
FROM orders_with_filtered_metadata
WHERE order_number = 'TEST-001';
-- Expected: Full original JSON including "internalField"
```

## API Endpoint Tests

### Test 5: Unified Orders Endpoint

```bash
# Test as driver
curl -H "Authorization: Bearer $DRIVER_TOKEN" \
  http://localhost:3000/api/orders/unified

# Verify response.orders[].hubspot_metadata contains only specialDeliveryInstructions

# Test as dispatcher
curl -H "Authorization: Bearer $DISPATCHER_TOKEN" \
  http://localhost:3000/api/orders/unified

# Verify response.orders[].hubspot_metadata contains all 3 allowed fields

# Test as admin
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/orders/unified

# Verify response.orders[].hubspot_metadata contains complete metadata
```

### Test 6: Admin HubSpot Fresh Data

```bash
# Should fail for non-admin
curl -H "Authorization: Bearer $DRIVER_TOKEN" \
  http://localhost:3000/api/admin/hubspot/ORDER_ID
# Expected: 403 Forbidden

# Should work for admin
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/hubspot/ORDER_ID
# Expected: 200 with fresh HubSpot data and comparison
```

## UI Component Tests

### Test 7: OrderDetailCard Display

1. **As Driver**: Should see "Delivery Instructions" section with only special instructions
2. **As Dispatcher**: Should see full instructions including "Recurring: weekly" and "Rush delivery requested"
3. **As Customer**: Should see only special instructions
4. **As Admin**: Should see everything + HubSpot link button

### Test 8: HubSpot Link Component

1. **As Driver/Dispatcher/Customer**: Component should not render
2. **As Admin**: Should see "View Deal in HubSpot" button that opens new tab

## Webhook Integration Test

### Test 9: HubSpot Property Update

1. Update special delivery instructions in HubSpot
2. Verify webhook received (check logs)
3. Verify only allowed fields cached:
   ```sql
   SELECT hubspot_metadata FROM orders WHERE order_number = 'TEST-001';
   -- Should only contain our 3 allowed fields, no extra HubSpot properties
   ```

## Performance Tests

### Test 10: Load Time Comparison

1. Measure page load time for orders list
2. Should load in <1 second (no HubSpot API calls)
3. Compare with previous implementation (if available)

## Security Tests

### Test 11: Direct Table Access

```sql
-- As driver, try to query orders table directly
SELECT hubspot_metadata FROM orders WHERE order_number = 'TEST-001';
-- Should still see full metadata (this is why we use the view!)

-- Verify the application uses the view
-- Check that useRealtimeOrders calls /api/orders/unified
```

### Test 12: SQL Injection

Test that role detection is secure:

1. Try to modify auth claims
2. Try to bypass role checks in API
3. Verify RLS policies prevent unauthorized access

## Checklist Summary

- [ ] Driver sees only delivery instructions
- [ ] Customer sees only delivery instructions
- [ ] Dispatcher sees instructions + scheduling metadata
- [ ] Admin sees all metadata unfiltered
- [ ] HubSpot link only visible to admin
- [ ] Unified API returns role-appropriate data
- [ ] Admin API requires admin role
- [ ] Webhook only caches allowed fields
- [ ] UI loads quickly without HubSpot calls
- [ ] Direct table access still filtered by RLS

## Troubleshooting

If metadata is not filtering correctly:

1. Check current user role:

   ```sql
   SELECT public.current_user_role();
   ```

2. Test the function directly:

   ```sql
   SELECT public.get_minimal_hubspot_metadata(
     '{"specialDeliveryInstructions": "test", "rushRequested": true}'::jsonb,
     'driver'::user_role
   );
   ```

3. Verify the view is using the function:

   ```sql
   \d+ orders_with_filtered_metadata
   ```

4. Check for any TypeScript errors in the UI components
