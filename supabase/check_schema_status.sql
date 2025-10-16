-- =============================================================================
-- Schema Status Check - Consolidated single-result version
-- =============================================================================

WITH table_checks AS (
  SELECT 
    'Base Tables' as check_category,
    string_agg(table_name, ', ' ORDER BY table_name) as status
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('customers', 'quotes', 'orders', 'drivers', 'dispatch_events', 
                       'webhook_events', 'hubspot_webhook_events', 'users', 'driver_locations')
),
hubspot_contact_check AS (
  SELECT 
    'HubSpot Contact ID' as check_category,
    CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'hubspot_contact_id')
      THEN 'EXISTS on customers table'
      ELSE 'MISSING from customers table'
    END as status
),
hubspot_deal_check AS (
  SELECT 
    'HubSpot Deal ID' as check_category,
    CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'hubspot_deal_id')
      THEN 'EXISTS on orders table'
      ELSE 'MISSING from orders table'
    END as status
),
push_subscription_check AS (
  SELECT 
    'Push Subscription' as check_category,
    CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'drivers' AND column_name = 'push_subscription')
      THEN 'EXISTS on drivers table'
      ELSE 'MISSING from drivers table'
    END as status
),
driver_locations_check AS (
  SELECT 
    'Driver Locations Table' as check_category,
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'driver_locations')
      THEN 'EXISTS'
      ELSE 'MISSING'
    END as status
),
customers_columns AS (
  SELECT 
    'Customers Columns' as check_category,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as status
  FROM information_schema.columns
  WHERE table_name = 'customers'
),
orders_columns AS (
  SELECT 
    'Orders Columns' as check_category,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as status
  FROM information_schema.columns
  WHERE table_name = 'orders'
),
drivers_columns AS (
  SELECT 
    'Drivers Columns' as check_category,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as status
  FROM information_schema.columns
  WHERE table_name = 'drivers'
)
SELECT 1 as sort_order, * FROM table_checks
UNION ALL SELECT 2, * FROM driver_locations_check
UNION ALL SELECT 3, * FROM hubspot_contact_check
UNION ALL SELECT 4, * FROM hubspot_deal_check
UNION ALL SELECT 5, * FROM push_subscription_check
UNION ALL SELECT 6, * FROM customers_columns
UNION ALL SELECT 7, * FROM orders_columns
UNION ALL SELECT 8, * FROM drivers_columns
ORDER BY sort_order;
