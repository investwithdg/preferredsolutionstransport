-- ============================================================================
-- Core Schema Migration
-- Creates all core tables, enums, and RLS policies for the application
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver', 'recipient');

-- Order status enum
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

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (links to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  email TEXT,
  role user_role,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_details TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  distance_mi NUMERIC NOT NULL,
  weight_lb NUMERIC,
  pricing JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  stripe_checkout_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  price_total NUMERIC NOT NULL,
  currency TEXT DEFAULT 'usd',
  status order_status DEFAULT 'Draft',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Dispatch events table (audit trail)
CREATE TABLE IF NOT EXISTS public.dispatch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  source TEXT,
  event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;

-- Webhook events table (Stripe webhook deduplication)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_order_id ON public.dispatch_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON public.webhook_events(stripe_event_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Users table policies
CREATE POLICY "Users can view their own record"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own record"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id);

CREATE POLICY "Admins and dispatchers can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Customers table policies
CREATE POLICY "Customers can view their own record"
  ON public.customers
  FOR SELECT
  USING (
    email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and dispatchers can view all customers"
  ON public.customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins and dispatchers can insert customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins and dispatchers can update customers"
  ON public.customers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Drivers table policies
CREATE POLICY "Drivers can view their own record"
  ON public.drivers
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update their own record"
  ON public.drivers
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins and dispatchers can view all drivers"
  ON public.drivers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins and dispatchers can insert drivers"
  ON public.drivers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins and dispatchers can update drivers"
  ON public.drivers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Quotes table policies
CREATE POLICY "Anyone can insert quotes"
  ON public.quotes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Customers can view their own quotes"
  ON public.quotes
  FOR SELECT
  USING (
    customer_id IN (
      SELECT c.id FROM public.customers c
      INNER JOIN auth.users au ON au.email = c.email
      WHERE au.id = auth.uid()
    )
  );

CREATE POLICY "Admins and dispatchers can view all quotes"
  ON public.quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins and dispatchers can update quotes"
  ON public.quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Orders table policies
CREATE POLICY "Customers can view their own orders"
  ON public.orders
  FOR SELECT
  USING (
    customer_id IN (
      SELECT c.id FROM public.customers c
      INNER JOIN auth.users au ON au.email = c.email
      WHERE au.id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view their assigned orders"
  ON public.orders
  FOR SELECT
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update their assigned orders"
  ON public.orders
  FOR UPDATE
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins and dispatchers can view all orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins and dispatchers can insert orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins and dispatchers can update orders"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Dispatch events policies
CREATE POLICY "Admins and dispatchers can view all dispatch events"
  ON public.dispatch_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Authenticated users can insert dispatch events"
  ON public.dispatch_events
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Webhook events policies (admin only)
CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert webhook events"
  ON public.webhook_events
  FOR INSERT
  WITH CHECK (true);
