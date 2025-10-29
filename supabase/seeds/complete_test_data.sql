-- =============================================================================
-- Complete Test Data Seed Script for Preferred Solutions Transport
-- =============================================================================
-- This script creates comprehensive test data including:
-- - Test customers with realistic data
-- - Sample quotes and orders in various statuses
-- - Driver records linked to auth users
-- - Integration metadata (HubSpot deals, Stripe payments)
-- - Complete data relationships for testing
--
-- Prerequisites:
-- 1. Auth users must be created first in Supabase Auth Dashboard
-- 2. Run this script AFTER creating the auth users
-- 3. Update emails to match your actual test user emails
--
-- Usage:
-- 1. Create auth users in Supabase Dashboard (see docs/TEST_USERS_SETUP.md)
-- 2. Update the email addresses below to match your test users
-- 3. Run this entire script in Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- CLEANUP (Optional - Comment out if you want to preserve existing data)
-- =============================================================================
-- Uncomment these lines to reset test data
/*
DELETE FROM public.driver_locations;
DELETE FROM public.dispatch_events WHERE source = 'test_seed';
DELETE FROM public.orders WHERE customer_id IN (SELECT id FROM public.customers WHERE email LIKE '%@test.preferredsolutions%');
DELETE FROM public.quotes WHERE customer_id IN (SELECT id FROM public.customers WHERE email LIKE '%@test.preferredsolutions%');
DELETE FROM public.customers WHERE email LIKE '%@test.preferredsolutions%';
DELETE FROM public.drivers WHERE user_id IS NULL OR email LIKE '%@test.preferredsolutions%';
DELETE FROM public.users WHERE email LIKE '%@test.preferredsolutions%';
*/

-- =============================================================================
-- STEP 1: Link Auth Users to Roles
-- =============================================================================
-- Update these emails to match the auth users you created in Supabase Dashboard

-- Admin User
INSERT INTO public.users (auth_id, email, role)
SELECT au.id, au.email, 'admin'::user_role
FROM auth.users au
WHERE au.email = 'admin@test.preferredsolutions'
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- Dispatcher User
INSERT INTO public.users (auth_id, email, role)
SELECT au.id, au.email, 'dispatcher'::user_role
FROM auth.users au
WHERE au.email = 'dispatcher@test.preferredsolutions'
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- Driver User
INSERT INTO public.users (auth_id, email, role)
SELECT au.id, au.email, 'driver'::user_role
FROM auth.users au
WHERE au.email = 'driver@test.preferredsolutions'
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- Customer/Recipient User
INSERT INTO public.users (auth_id, email, role)
SELECT au.id, au.email, 'recipient'::user_role
FROM auth.users au
WHERE au.email = 'customer@test.preferredsolutions'
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- =============================================================================
-- STEP 2: Create Test Customers
-- =============================================================================

-- Test customer linked to auth user
INSERT INTO public.customers (id, email, name, phone, hubspot_contact_id, auth_email)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'customer@test.preferredsolutions',
    'Test Customer',
    '(555) 123-4567',
    'test_contact_001',
    'customer@test.preferredsolutions'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'john.smith@test.preferredsolutions',
    'John Smith',
    '(555) 234-5678',
    'test_contact_002',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'sarah.johnson@test.preferredsolutions',
    'Sarah Johnson',
    '(555) 345-6789',
    'test_contact_003',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'mike.davis@test.preferredsolutions',
    'Mike Davis',
    '(555) 456-7890',
    'test_contact_004',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 3: Create Test Drivers
-- =============================================================================

-- Link primary test driver to auth user
DO $$
DECLARE 
  v_driver_auth_id uuid;
  v_driver_id uuid := '00000000-0000-0000-0000-000000000101';
BEGIN
  -- Get the auth user ID for the driver
  SELECT id INTO v_driver_auth_id 
  FROM auth.users 
  WHERE email = 'driver@test.preferredsolutions';

  -- Insert or update the driver
  INSERT INTO public.drivers (id, user_id, name, phone, vehicle_details)
  VALUES (
    v_driver_id,
    v_driver_auth_id,
    'Test Driver',
    '(555) 111-2222',
    '{"make": "Ford", "model": "Transit", "license_plate": "TEST001", "color": "White", "year": 2022}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE 
  SET user_id = EXCLUDED.user_id,
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      vehicle_details = EXCLUDED.vehicle_details;
END $$;

-- Additional test drivers (not linked to auth users)
INSERT INTO public.drivers (id, user_id, name, phone, vehicle_details)
VALUES 
  (
    '00000000-0000-0000-0000-000000000102',
    NULL,
    'Alice Martinez',
    '(555) 222-3333',
    '{"make": "Mercedes", "model": "Sprinter", "license_plate": "TEST002", "color": "Silver", "year": 2023}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    NULL,
    'Bob Williams',
    '(555) 333-4444',
    '{"make": "Isuzu", "model": "NPR", "license_plate": "TEST003", "color": "Blue", "year": 2021}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    NULL,
    'Carol Anderson',
    '(555) 444-5555',
    '{"make": "Ford", "model": "E-350", "license_plate": "TEST004", "color": "White", "year": 2022}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 4: Create Test Quotes
-- =============================================================================

INSERT INTO public.quotes (id, customer_id, pickup_address, dropoff_address, distance_mi, weight_lb, pricing, expires_at, status, stripe_checkout_session_id)
VALUES 
  -- Quote 1: Converted to order (for Test Customer)
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000001',
    '123 Main St, New York, NY 10001',
    '456 Oak Ave, Brooklyn, NY 11201',
    8.5,
    150,
    '{"baseFee": 50.00, "perMileRate": 2.00, "fuelSurcharge": 0.10, "subtotal": 67.00, "total": 73.70}'::jsonb,
    NOW() + INTERVAL '7 days',
    'Accepted',
    'cs_test_completed_001'
  ),
  -- Quote 2: Pending quote (for John Smith)
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000002',
    '789 Elm St, Manhattan, NY 10011',
    '321 Pine St, Queens, NY 11101',
    12.3,
    200,
    '{"baseFee": 50.00, "perMileRate": 2.00, "fuelSurcharge": 0.10, "subtotal": 74.60, "total": 82.06}'::jsonb,
    NOW() + INTERVAL '3 days',
    'Draft',
    NULL
  ),
  -- Quote 3: Recent quote for Sarah
  (
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000003',
    '555 Broadway, New York, NY 10012',
    '888 Park Ave, Bronx, NY 10451',
    15.7,
    300,
    '{"baseFee": 50.00, "perMileRate": 2.00, "fuelSurcharge": 0.10, "subtotal": 81.40, "total": 89.54}'::jsonb,
    NOW() + INTERVAL '5 days',
    'Draft',
    'cs_test_pending_001'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 5: Create Test Orders with Various Statuses
-- =============================================================================

INSERT INTO public.orders (
  id, 
  quote_id, 
  customer_id, 
  price_total, 
  currency, 
  status, 
  stripe_payment_intent_id, 
  stripe_checkout_session_id,
  driver_id,
  hubspot_deal_id,
  hubspot_metadata,
  created_at,
  updated_at
)
VALUES 
  -- Order 1: Ready for Dispatch (no driver assigned yet)
  (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000001',
    73.70,
    'usd',
    'ReadyForDispatch',
    'pi_test_ready_001',
    'cs_test_completed_001',
    NULL,
    'test_deal_001',
    '{"dealId": "test_deal_001", "syncStatus": "synced", "lastSyncedAt": "' || NOW()::text || '", "dealPipeline": "ReadyForDispatch", "deliveryStatus": "pending"}'::jsonb,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  ),
  -- Order 2: Assigned to Test Driver
  (
    '00000000-0000-0000-0000-000000000302',
    NULL,
    '00000000-0000-0000-0000-000000000002',
    82.06,
    'usd',
    'Assigned',
    'pi_test_assigned_001',
    'cs_test_completed_002',
    '00000000-0000-0000-0000-000000000101',
    'test_deal_002',
    '{"dealId": "test_deal_002", "syncStatus": "synced", "lastSyncedAt": "' || (NOW() - INTERVAL '1 hour')::text || '", "dealPipeline": "Assigned", "deliveryStatus": "assigned", "assignedDriver": "Test Driver"}'::jsonb,
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '1 hour'
  ),
  -- Order 3: In Transit (Alice Martinez)
  (
    '00000000-0000-0000-0000-000000000303',
    NULL,
    '00000000-0000-0000-0000-000000000003',
    95.50,
    'usd',
    'InTransit',
    'pi_test_transit_001',
    'cs_test_completed_003',
    '00000000-0000-0000-0000-000000000102',
    'test_deal_003',
    '{"dealId": "test_deal_003", "syncStatus": "synced", "lastSyncedAt": "' || (NOW() - INTERVAL '30 minutes')::text || '", "dealPipeline": "InTransit", "deliveryStatus": "in_transit", "assignedDriver": "Alice Martinez"}'::jsonb,
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '30 minutes'
  ),
  -- Order 4: Delivered (completed)
  (
    '00000000-0000-0000-0000-000000000304',
    NULL,
    '00000000-0000-0000-0000-000000000004',
    67.00,
    'usd',
    'Delivered',
    'pi_test_delivered_001',
    'cs_test_completed_004',
    '00000000-0000-0000-0000-000000000103',
    'test_deal_004',
    '{"dealId": "test_deal_004", "syncStatus": "synced", "lastSyncedAt": "' || (NOW() - INTERVAL '1 day')::text || '", "dealPipeline": "Delivered", "deliveryStatus": "delivered", "assignedDriver": "Bob Williams", "deliveredAt": "' || (NOW() - INTERVAL '1 day')::text || '"}'::jsonb,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
  ),
  -- Order 5: Awaiting Payment
  (
    '00000000-0000-0000-0000-000000000305',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000003',
    89.54,
    'usd',
    'AwaitingPayment',
    NULL,
    'cs_test_pending_001',
    NULL,
    NULL,
    '{}'::jsonb,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  ),
  -- Order 6: Accepted by Driver
  (
    '00000000-0000-0000-0000-000000000306',
    NULL,
    '00000000-0000-0000-0000-000000000001',
    120.00,
    'usd',
    'Accepted',
    'pi_test_accepted_001',
    'cs_test_completed_005',
    '00000000-0000-0000-0000-000000000101',
    'test_deal_005',
    '{"dealId": "test_deal_005", "syncStatus": "synced", "lastSyncedAt": "' || (NOW() - INTERVAL '2 hours')::text || '", "dealPipeline": "Accepted", "deliveryStatus": "accepted", "assignedDriver": "Test Driver"}'::jsonb,
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '2 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 6: Create Dispatch Events for Tracking
-- =============================================================================

INSERT INTO public.dispatch_events (order_id, actor, source, event_id, event_type, payload)
VALUES 
  -- Events for Order 1 (ReadyForDispatch)
  (
    '00000000-0000-0000-0000-000000000301',
    'system',
    'test_seed',
    'evt_test_001_created',
    'order.created',
    '{"orderId": "00000000-0000-0000-0000-000000000301", "status": "ReadyForDispatch"}'::jsonb
  ),
  -- Events for Order 2 (Assigned)
  (
    '00000000-0000-0000-0000-000000000302',
    'system',
    'test_seed',
    'evt_test_002_created',
    'order.created',
    '{"orderId": "00000000-0000-0000-0000-000000000302", "status": "ReadyForDispatch"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    'dispatcher@test.preferredsolutions',
    'test_seed',
    'evt_test_002_assigned',
    'order.assigned',
    '{"orderId": "00000000-0000-0000-0000-000000000302", "driverId": "00000000-0000-0000-0000-000000000101", "status": "Assigned"}'::jsonb
  ),
  -- Events for Order 3 (InTransit)
  (
    '00000000-0000-0000-0000-000000000303',
    'system',
    'test_seed',
    'evt_test_003_created',
    'order.created',
    '{"orderId": "00000000-0000-0000-0000-000000000303"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000303',
    'driver@test.preferredsolutions',
    'test_seed',
    'evt_test_003_picked_up',
    'order.picked_up',
    '{"orderId": "00000000-0000-0000-0000-000000000303", "status": "InTransit"}'::jsonb
  )
ON CONFLICT (source, event_id) DO NOTHING;

-- =============================================================================
-- STEP 7: Create Driver Locations (for mapping)
-- =============================================================================

INSERT INTO public.driver_locations (driver_id, latitude, longitude, heading, speed_mph)
VALUES 
  -- Test Driver location (in Manhattan)
  (
    '00000000-0000-0000-0000-000000000101',
    40.7580,
    -73.9855,
    45.5,
    25.0
  ),
  -- Alice Martinez location (in Brooklyn)
  (
    '00000000-0000-0000-0000-000000000102',
    40.6782,
    -73.9442,
    120.0,
    30.0
  ),
  -- Bob Williams location (in Queens)
  (
    '00000000-0000-0000-0000-000000000103',
    40.7282,
    -73.7949,
    270.0,
    20.0
  )
ON CONFLICT (driver_id) DO UPDATE
SET 
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  heading = EXCLUDED.heading,
  speed_mph = EXCLUDED.speed_mph,
  updated_at = NOW();

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

DO $$
DECLARE
  user_count integer;
  customer_count integer;
  driver_count integer;
  quote_count integer;
  order_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users WHERE email LIKE '%@test.preferredsolutions%';
  SELECT COUNT(*) INTO customer_count FROM public.customers WHERE email LIKE '%@test.preferredsolutions%';
  SELECT COUNT(*) INTO driver_count FROM public.drivers WHERE id::text LIKE '00000000-0000-0000-0000-00000000010%';
  SELECT COUNT(*) INTO quote_count FROM public.quotes WHERE id::text LIKE '00000000-0000-0000-0000-00000000020%';
  SELECT COUNT(*) INTO order_count FROM public.orders WHERE id::text LIKE '00000000-0000-0000-0000-00000000030%';
  
  RAISE NOTICE '=== Test Data Created Successfully ===';
  RAISE NOTICE 'Users: %', user_count;
  RAISE NOTICE 'Customers: %', customer_count;
  RAISE NOTICE 'Drivers: %', driver_count;
  RAISE NOTICE 'Quotes: %', quote_count;
  RAISE NOTICE 'Orders: %', order_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Log in to the app with your test user credentials';
  RAISE NOTICE '2. Verify each role can see appropriate data';
  RAISE NOTICE '3. Test dispatcher assigning orders to drivers';
  RAISE NOTICE '4. Test driver accepting and updating orders';
  RAISE NOTICE '';
  RAISE NOTICE 'See docs/TEST_USERS_SETUP.md for login credentials and testing guide';
END $$;

