-- =============================================================================
-- Schema Status Check - Run this to see what already exists
-- =============================================================================

-- Check if base tables exist
SELECT 
  'Base Tables' as category,
  string_agg(table_name, ', ') as existing_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('customers', 'quotes', 'orders', 'drivers', 'dispatch_events', 'webhook_events', 'users', 'driver_locations');

-- Check if order_status enum exists
SELECT 
  'Enums' as category,
  string_agg(typname, ', ') as existing_types
FROM pg_type 
WHERE typname = 'order_status' 
  AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check if driver_locations table exists
SELECT 
  'Driver Locations Table' as category,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_locations')
    THEN 'EXISTS'
    ELSE 'DOES NOT EXIST'
  END as status;

-- Check if push_subscription column exists on drivers table
SELECT 
  'Push Subscription Column' as category,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'drivers' AND column_name = 'push_subscription')
    THEN 'EXISTS'
    ELSE 'DOES NOT EXIST'
  END as status;

-- List all columns in drivers table
SELECT 
  'Drivers Table Columns' as category,
  string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'drivers'
GROUP BY table_name;
