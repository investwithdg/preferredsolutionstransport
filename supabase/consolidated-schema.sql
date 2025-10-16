-- =============================================================================
-- Preferred Solutions Transport - Complete Database Schema
-- Consolidated schema for all milestones
-- NOTE: This file is the canonical source of truth for the database.
--       Prefer edits here over individual migrations; ensure PRs update this.
-- =============================================================================
-- 
-- This file contains the complete database schema including:
-- - Core tables (customers, quotes, orders, dispatch_events, webhook_events)
-- - Driver management with locations and push notifications
-- - HubSpot integration (webhook events, contact/deal sync)
-- - All triggers, functions, and policies
-- - Test data seeding
--
-- Usage: Copy and paste this entire file into your Supabase SQL Editor
-- =============================================================================

-- Drop existing objects if they exist (CAUTION: This will delete all data!)
-- Uncomment the following lines only if you want to completely reset your database
/*
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.dispatch_events CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
*/

-- =============================================================================
-- ENUMS AND TYPES
-- =============================================================================

-- Create order status enum
CREATE TYPE order_status AS ENUM (
  'Draft',
  'AwaitingPayment',
  'ReadyForDispatch',
  'Assigned',
  'Accepted',
  'PickedUp',
  'InTransit',
  'Delivered',
  'Canceled'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  phone text,
  hubspot_contact_id text,
  created_at timestamptz DEFAULT now()
);

-- Quotes table - stores pricing calculations and customer requests
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  distance_mi numeric NOT NULL,
  weight_lb numeric,
  pricing jsonb NOT NULL, -- { baseFee, perMileRate, fuelPct, subtotal, total }
  expires_at timestamptz,
  status text DEFAULT 'Draft',
  stripe_checkout_session_id text,
  created_at timestamptz DEFAULT now()
);

-- Orders table - created after successful payment
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id),
  customer_id uuid REFERENCES public.customers(id),
  price_total numeric NOT NULL,
  currency text DEFAULT 'usd',
  status order_status NOT NULL DEFAULT 'AwaitingPayment',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  driver_id uuid, -- Will be linked to drivers table below
  hubspot_deal_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drivers table (Milestone 2)
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE, -- Nullable for now, will be required later
  name text NOT NULL,
  phone text,
  vehicle_details jsonb, -- { "make": "Ford", "model": "Transit", "license_plate": "ABC1234" }
  push_subscription jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for driver_id in orders table
ALTER TABLE public.orders 
ADD CONSTRAINT orders_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES public.drivers(id);

-- Dispatch events table - audit trail for order lifecycle
CREATE TABLE IF NOT EXISTS public.dispatch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  actor text NOT NULL, -- 'system' for webhooks, driver name, dispatcher name, etc.
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  event_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Webhook events table - for idempotency and audit
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- HubSpot webhook events table - for idempotency and audit
CREATE TABLE IF NOT EXISTS public.hubspot_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  object_type text NOT NULL CHECK (object_type IN ('contact', 'deal')),
  object_id text NOT NULL,
  portal_id integer,
  occurred_at bigint,
  processed_at timestamptz DEFAULT now(),
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Driver locations table - for live tracking
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  accuracy decimal, -- Accuracy in meters
  heading decimal, -- Direction in degrees (0-360)
  speed decimal, -- Speed in meters per second
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT valid_heading CHECK (heading IS NULL OR (heading >= 0 AND heading <= 360))
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON public.orders(driver_id, status);

-- Dispatch events indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatch_events_source_event 
  ON public.dispatch_events(source, event_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_order_created 
  ON public.dispatch_events(order_id, created_at DESC);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id 
  ON public.webhook_events(stripe_event_id);

-- HubSpot webhook events indexes
CREATE INDEX IF NOT EXISTS idx_hubspot_webhook_events_event_id 
  ON public.hubspot_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_webhook_events_object 
  ON public.hubspot_webhook_events(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_webhook_events_created_at 
  ON public.hubspot_webhook_events(created_at DESC);

-- Driver locations indexes
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id 
  ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id 
  ON public.driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at 
  ON public.driver_locations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_order 
  ON public.driver_locations(driver_id, order_id, created_at DESC);

-- Driver push subscription index
CREATE INDEX IF NOT EXISTS idx_drivers_push_subscription 
  ON public.drivers ((push_subscription IS NOT NULL));

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Append-only guard for dispatch_events
CREATE OR REPLACE FUNCTION public.no_update_delete_dispatch_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'dispatch_events is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_events_protect ON public.dispatch_events;
CREATE TRIGGER trg_dispatch_events_protect
  BEFORE UPDATE OR DELETE ON public.dispatch_events
  FOR EACH ROW EXECUTE FUNCTION public.no_update_delete_dispatch_events();

-- Order status transition guard (allow only legal transitions)
CREATE OR REPLACE FUNCTION public.validate_order_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE 
  ok boolean := false;
BEGIN
  IF tg_op <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Allow idempotent updates
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allow cancel from any non-final status
  IF NEW.status = 'Canceled' THEN
    RETURN NEW;
  END IF;

  -- Allowed forward transitions
  IF (OLD.status, NEW.status) IN (
    ('ReadyForDispatch','Assigned'),
    ('Assigned','Accepted'),
    ('Accepted','PickedUp'),
    ('PickedUp','InTransit'),
    ('InTransit','Delivered')
  ) THEN 
    ok := true; 
  END IF;

  IF NOT ok THEN
    RAISE EXCEPTION 'Illegal status transition: % -> %', OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_status ON public.orders;
CREATE TRIGGER trg_orders_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_transition();

-- Quote expiry function
CREATE OR REPLACE FUNCTION public.expire_quotes()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.quotes
  SET status = 'Expired'
  WHERE expires_at < now() AND COALESCE(status, '') <> 'Expired';
END $$;

-- =============================================================================
-- ROLE-BASED ACCESS CONTROL SETUP
-- =============================================================================

-- Create user role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','dispatcher','driver','recipient');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users table for role-based access control
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id),
  email text UNIQUE,
  role user_role,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Service role full access to users
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users"
  ON public.users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can read their own record
DROP POLICY IF EXISTS "Users manage own record" ON public.users;
CREATE POLICY "Users read own record"
  ON public.users FOR SELECT 
  USING (auth.uid() = auth_id);

-- Users can update their own record  
DROP POLICY IF EXISTS "Users update own record" ON public.users;
CREATE POLICY "Users update own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$;

-- Helper function to check if user is admin or dispatcher
CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT public.current_user_role() IN ('admin','dispatcher');
$$;

-- Add auth_email column to customers for recipient mapping
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_email text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_customers_auth_email ON public.customers(auth_email);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) AND POLICIES
-- =============================================================================
-- 
-- USER ROLES IN THIS SYSTEM:
-- 1. ANONYMOUS - Public users requesting quotes (not logged in)
-- 2. RECIPIENT - Authenticated customers tracking their orders
-- 3. DRIVER - Authenticated drivers viewing/updating assigned orders
-- 4. DISPATCHER - Authenticated staff managing orders and assignments
-- 5. ADMIN - Full system access for management
-- 6. SERVICE_ROLE - Backend API operations (full access)
--
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hubspot_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow drivers to see their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Allow drivers to update their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role full access to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow drivers to view their own record" ON public.drivers;
DROP POLICY IF EXISTS "Allow authenticated users to view all drivers" ON public.drivers;

-- =============================================================================
-- SERVICE ROLE POLICIES (Backend API - Full Access)
-- =============================================================================
CREATE POLICY "Service role full access customers" 
  ON public.customers FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access quotes" 
  ON public.quotes FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access orders" 
  ON public.orders FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access drivers" 
  ON public.drivers FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access dispatch_events" 
  ON public.dispatch_events FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access webhook_events" 
  ON public.webhook_events FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access hubspot_webhook_events" 
  ON public.hubspot_webhook_events FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access driver_locations" 
  ON public.driver_locations FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- ANONYMOUS USER POLICIES (Public Quote Requests)
-- =============================================================================
-- Allow anonymous users to submit quote requests and create customer records
CREATE POLICY "Anonymous insert customers" 
  ON public.customers FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anonymous insert quotes" 
  ON public.quotes FOR INSERT 
  WITH CHECK (true);

-- =============================================================================
-- ADMIN & DISPATCHER POLICIES (Full Operational Access)
-- =============================================================================
-- Admin and Dispatcher can manage all orders, drivers, and dispatch events

-- Orders: Full CRUD access
CREATE POLICY "Admin dispatcher full orders"
  ON public.orders FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- Drivers: Full CRUD access (for managing driver accounts)
CREATE POLICY "Admin dispatcher full drivers"
  ON public.drivers FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- Dispatch Events: Full access to audit trail
CREATE POLICY "Admin dispatcher full dispatch_events"
  ON public.dispatch_events FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- =============================================================================
-- DRIVER POLICIES (Own Profile + Assigned Orders)
-- =============================================================================
-- Drivers can view/update their own profile
CREATE POLICY "Drivers manage own profile"
  ON public.drivers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drivers can view ALL driver profiles (for reference in dispatcher view)
CREATE POLICY "Drivers view all driver profiles"
  ON public.drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid()
    )
  );

-- Drivers can view orders assigned to them
CREATE POLICY "Drivers view assigned orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
    )
  );

-- Drivers can update status of orders assigned to them
-- (Status transitions are validated by validate_order_transition trigger)
CREATE POLICY "Drivers update assigned orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
    )
  );

-- Drivers can view dispatch events for their orders
CREATE POLICY "Drivers view own dispatch events"
  ON public.dispatch_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.drivers d ON d.id = o.driver_id
      WHERE o.id = dispatch_events.order_id AND d.user_id = auth.uid()
    )
  );

-- Drivers can read their own location history
CREATE POLICY "Drivers can read their own locations"
  ON public.driver_locations
  FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers 
      WHERE user_id = auth.uid()
    )
  );

-- Drivers can insert their own locations
CREATE POLICY "Drivers can insert their own locations"
  ON public.driver_locations
  FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- RECIPIENT POLICIES (Customers Tracking Their Orders)
-- =============================================================================
-- Recipients can view their own customer record
CREATE POLICY "Recipients view own customer record"
  ON public.customers FOR SELECT
  USING (auth.email() = auth_email);

-- Recipients can view orders they placed
CREATE POLICY "Recipients view own orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = orders.customer_id AND c.auth_email = auth.email()
    )
  );

-- Recipients can view dispatch events for their orders
CREATE POLICY "Recipients view own dispatch_events"
  ON public.dispatch_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE o.id = dispatch_events.order_id AND c.auth_email = auth.email()
    )
  );

-- Recipients can view quotes they created
CREATE POLICY "Recipients view own quotes"
  ON public.quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = quotes.customer_id AND c.auth_email = auth.email()
    )
  );

-- =============================================================================
-- SEED DATA FOR TESTING
-- =============================================================================

-- Insert test drivers (user_id will be NULL for now - demo mode)
INSERT INTO public.drivers (name, phone, vehicle_details) VALUES 
  ('John Smith', '555-0101', '{"make": "Ford", "model": "Transit", "license_plate": "ABC1234", "color": "White"}'),
  ('Sarah Johnson', '555-0102', '{"make": "Mercedes", "model": "Sprinter", "license_plate": "DEF5678", "color": "Blue"}'),
  ('Mike Davis', '555-0103', '{"make": "Isuzu", "model": "NPR", "license_plate": "GHI9012", "color": "Silver"}'),
  ('Lisa Wilson', '555-0104', '{"make": "Ford", "model": "E-350", "license_plate": "JKL3456", "color": "White"}'),
  ('Tom Anderson', '555-0105', '{"make": "Chevrolet", "model": "Express", "license_plate": "MNO7890", "color": "Gray"}')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify drivers were created
DO $$
BEGIN
  RAISE NOTICE 'Drivers created:';
  PERFORM * FROM public.drivers;
END $$;

-- Verify table structure
DO $$
DECLARE
  table_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('customers', 'quotes', 'orders', 'drivers', 'dispatch_events', 'webhook_events');
  
  RAISE NOTICE 'Created % tables successfully', table_count;
END $$;

-- =============================================================================
-- SCHEMA RELOAD NOTIFICATION
-- =============================================================================

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'SCHEMA SETUP COMPLETE!';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Tables created: customers, quotes, orders, drivers, dispatch_events, webhook_events';
  RAISE NOTICE 'Test drivers seeded: 5 drivers available for testing';
  RAISE NOTICE 'Schema cache reloaded automatically';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test the quote → payment → dispatcher flow';
  RAISE NOTICE '2. Test driver assignment and status updates';
  RAISE NOTICE '3. Verify webhook processing is working';
  RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- RATE LIMITING INFRASTRUCTURE
-- =============================================================================

-- Table to track API request counts for rate limiting
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role access to rate limits
CREATE POLICY "Service role access to rate limits"
  ON public.api_rate_limits FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON public.api_rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.api_rate_limits(window_start);

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE window_start < now() - interval '1 hour';
END $$;

-- Function to check and update rate limits (fixed to avoid variable/column name collision)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_limit integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_current_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := date_trunc('minute', now()) - (p_window_minutes || ' minutes')::interval;

  SELECT request_count INTO v_current_count
  FROM public.api_rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;

  IF v_current_count IS NULL THEN
    INSERT INTO public.api_rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, v_window_start);
    RETURN true;
  ELSIF v_current_count < p_limit THEN
    UPDATE public.api_rate_limits
    SET request_count = request_count + 1,
        updated_at = now()
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start >= v_window_start;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END $$;

-- =============================================================================
-- PRODUCTION CONSTRAINTS AND INDEXES
-- =============================================================================

-- Data quality checks for quotes
DO $$ BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT check_positive_distance CHECK (distance_mi > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT check_positive_weight CHECK (weight_lb IS NULL OR weight_lb > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.quotes
    ADD CONSTRAINT check_valid_pricing CHECK (pricing->>'total' IS NOT NULL AND (pricing->>'total')::numeric >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Data quality checks for orders
DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT check_positive_price CHECK (price_total > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Performance indexes for production workloads
CREATE INDEX IF NOT EXISTS idx_quotes_status_created ON public.quotes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON public.orders(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_stripe_session ON public.quotes(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_active_status ON public.orders(status) WHERE status NOT IN ('Delivered', 'Canceled');
-- Note: Cannot use expires_at > now() in index predicate (now() is not IMMUTABLE)
-- Use expires_at index separately for expiry queries
CREATE INDEX IF NOT EXISTS idx_quotes_active ON public.quotes(id, status) WHERE status = 'Draft';

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON public.quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_quote_id ON public.orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- HubSpot integration indexes
CREATE INDEX IF NOT EXISTS idx_orders_hubspot_deal_id 
  ON public.orders(hubspot_deal_id) 
  WHERE hubspot_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_hubspot_contact_id 
  ON public.customers(hubspot_contact_id) 
  WHERE hubspot_contact_id IS NOT NULL;

-- =============================================================================
-- MONITORING FUNCTIONS
-- =============================================================================

-- Function to clean up old location data (keep last 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_driver_locations()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.driver_locations
  WHERE created_at < NOW() - INTERVAL '24 hours';
END $$;

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', now(),
    'database', jsonb_build_object(
      'total_orders', (SELECT count(*) FROM public.orders),
      'active_orders', (SELECT count(*) FROM public.orders WHERE status NOT IN ('Delivered', 'Canceled')),
      'total_quotes', (SELECT count(*) FROM public.quotes),
      'expired_quotes', (SELECT count(*) FROM public.quotes WHERE status = 'Expired'),
      'total_customers', (SELECT count(*) FROM public.customers),
      'total_drivers', (SELECT count(*) FROM public.drivers),
      'webhook_events_today', (SELECT count(*) FROM public.webhook_events WHERE created_at >= CURRENT_DATE),
      'dispatch_events_today', (SELECT count(*) FROM public.dispatch_events WHERE created_at >= CURRENT_DATE)
    ),
    'recent_activity', jsonb_build_object(
      'orders_last_hour', (SELECT count(*) FROM public.orders WHERE created_at >= now() - interval '1 hour'),
      'quotes_last_hour', (SELECT count(*) FROM public.quotes WHERE created_at >= now() - interval '1 hour')
    )
  ) INTO result;

  RETURN result;
END $$;

-- Function to detect potential issues
CREATE OR REPLACE FUNCTION public.get_system_alerts()
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', now(),
    'alerts', jsonb_agg(
      jsonb_build_object(
        'type', alert_type,
        'message', alert_message,
        'count', alert_count
      )
    )
  ) INTO result
  FROM (
    SELECT 'warning' as alert_type,
           'Orders stuck in non-terminal states > 24h' as alert_message,
           count(*) as alert_count
    FROM public.orders
    WHERE status NOT IN ('Delivered', 'Canceled')
      AND updated_at < now() - interval '24 hours'

    UNION ALL

    SELECT 'error' as alert_type,
           'Webhook events not processed' as alert_message,
           count(*) as alert_count
    FROM public.webhook_events
    WHERE processed_at IS NULL
      AND created_at < now() - interval '1 hour'

    UNION ALL

    SELECT 'warning' as alert_type,
           'Potential duplicate customers' as alert_message,
           count(*) - count(distinct email) as alert_count
    FROM public.customers
    WHERE email IS NOT NULL
  ) alerts
  WHERE alert_count > 0;

  RETURN result;
END $$;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_system_health() IS 'Returns system health metrics for monitoring';
COMMENT ON FUNCTION public.get_system_alerts() IS 'Returns potential system issues for alerting';
COMMENT ON FUNCTION public.check_rate_limit(text, text, integer, integer) IS 'Rate limiting function for API endpoints';
COMMENT ON FUNCTION public.cleanup_old_driver_locations IS 'Removes driver location records older than 24 hours to save storage';
COMMENT ON TABLE public.api_rate_limits IS 'Tracks API request counts for rate limiting';
COMMENT ON TABLE public.users IS 'User roles for access control (admin, dispatcher, driver, recipient)';
COMMENT ON TABLE public.driver_locations IS 'Real-time driver location tracking for live order updates';
COMMENT ON TABLE public.hubspot_webhook_events IS 'Stores HubSpot webhook events for idempotent processing and audit trail';
COMMENT ON COLUMN public.orders.hubspot_deal_id IS 'HubSpot deal ID for bi-directional sync';
COMMENT ON COLUMN public.customers.hubspot_contact_id IS 'HubSpot contact ID for bi-directional sync';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- COMPLETE SCHEMA DEPLOYMENT SUCCESS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'COMPLETE SCHEMA DEPLOYMENT SUCCESSFUL!';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Core Tables: customers, quotes, orders, drivers, dispatch_events';
  RAISE NOTICE 'Webhook Tables: webhook_events (Stripe), hubspot_webhook_events';
  RAISE NOTICE 'Driver Features: driver_locations (live tracking), push_subscription';
  RAISE NOTICE 'HubSpot Integration: hubspot_deal_id, hubspot_contact_id columns';
  RAISE NOTICE 'RBAC System: users table with 4 roles (admin, dispatcher, driver, recipient)';
  RAISE NOTICE 'Security: Row-Level Security policies for all roles';
  RAISE NOTICE 'Rate Limiting: api_rate_limits table and check_rate_limit() function';
  RAISE NOTICE 'Monitoring: get_system_health() and get_system_alerts() functions';
  RAISE NOTICE 'Performance: Production-ready indexes and constraints';
  RAISE NOTICE 'Test Data: 5 demo drivers seeded for testing';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Create user accounts and assign roles in users table';
  RAISE NOTICE '2. Test role-based access for each dashboard';
  RAISE NOTICE '3. Verify order workflow: quote → payment → dispatch → delivery';
  RAISE NOTICE '4. Configure HubSpot webhook endpoint and VAPID keys for push notifications';
  RAISE NOTICE '=============================================================================';
END $$;
