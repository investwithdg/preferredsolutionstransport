-- =============================================================================
-- Preferred Solutions Transport - Complete Database Schema
-- Consolidated schema for Milestones 1 & 2
-- =============================================================================
-- 
-- This file contains the complete database schema including:
-- - Core tables (customers, quotes, orders, dispatch_events, webhook_events)
-- - Driver management (Milestone 2)
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
-- ROW LEVEL SECURITY (RLS) AND POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow drivers to see their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Allow drivers to update their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role full access to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow drivers to view their own record" ON public.drivers;
DROP POLICY IF EXISTS "Allow authenticated users to view all drivers" ON public.drivers;

-- Service role policies (full access for API operations)
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

-- Anonymous access policies (for customer-facing operations)
CREATE POLICY "Anonymous insert customers" 
  ON public.customers FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anonymous insert quotes" 
  ON public.quotes FOR INSERT 
  WITH CHECK (true);

-- Authenticated user policies for orders
CREATE POLICY "Authenticated read access to orders"
  ON public.orders FOR SELECT
  USING (auth.role() = 'authenticated');

-- Driver-specific policies
CREATE POLICY "Drivers view their own record"
  ON public.drivers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users view all drivers"
  ON public.drivers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Drivers see their assigned orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
    )
  );

CREATE POLICY "Drivers update their assigned orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
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
