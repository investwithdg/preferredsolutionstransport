-- Complete Schema Fix for Preferred Solutions Transport
-- This script will recreate the necessary tables with proper constraints

-- First, let's backup any existing data (optional - run these SELECT statements to save data)
-- SELECT * FROM public.customers;
-- SELECT * FROM public.quotes;
-- SELECT * FROM public.orders;

-- Drop existing tables (BE CAREFUL - this will delete all data!)
-- Uncomment these lines only if you're sure you want to drop and recreate
-- DROP TABLE IF EXISTS public.dispatch_events CASCADE;
-- DROP TABLE IF EXISTS public.webhook_events CASCADE;
-- DROP TABLE IF EXISTS public.orders CASCADE;
-- DROP TABLE IF EXISTS public.quotes CASCADE;
-- DROP TABLE IF EXISTS public.customers CASCADE;
-- DROP TYPE IF EXISTS order_status CASCADE;

-- Create order status enum
CREATE TYPE order_status AS ENUM (
  'Draft','AwaitingPayment','ReadyForDispatch','Assigned','Accepted','PickedUp','InTransit','Delivered','Canceled'
);

-- Recreate customers table with proper unique constraint
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT customers_email_key UNIQUE (email)
);

-- Create index for email lookups
CREATE INDEX idx_customers_email ON public.customers(email);

-- Recreate quotes table
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  distance_mi numeric NOT NULL,
  weight_lb numeric,
  pricing jsonb NOT NULL,
  expires_at timestamptz,
  status text DEFAULT 'Draft',
  stripe_checkout_session_id text,
  created_at timestamptz DEFAULT now()
);

-- Recreate orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id),
  customer_id uuid REFERENCES public.customers(id),
  price_total numeric NOT NULL,
  currency text DEFAULT 'usd',
  status order_status NOT NULL DEFAULT 'AwaitingPayment',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate dispatch events table
CREATE TABLE public.dispatch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  actor text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  source text NOT NULL,
  event_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint for idempotency
CREATE UNIQUE INDEX idx_dispatch_events_source_event ON public.dispatch_events (source, event_id);
CREATE INDEX idx_dispatch_events_order_created ON public.dispatch_events (order_id, created_at DESC);

-- Recreate webhook events table
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_webhook_events_stripe_id ON public.webhook_events(stripe_event_id);
CREATE INDEX idx_orders_status_created ON public.orders (status, created_at DESC);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow anonymous read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow service role full access customers" ON public.customers FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access quotes" ON public.quotes FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access orders" ON public.orders FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access dispatch_events" ON public.dispatch_events FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access webhook_events" ON public.webhook_events FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow anonymous insert quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert customers" ON public.customers FOR INSERT WITH CHECK (true);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create append-only guard for dispatch_events
CREATE OR REPLACE FUNCTION public.no_update_delete_dispatch_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'dispatch_events is append-only';
END $$;

CREATE TRIGGER trg_dispatch_events_protect
BEFORE UPDATE OR DELETE ON public.dispatch_events
FOR EACH ROW EXECUTE FUNCTION public.no_update_delete_dispatch_events();

-- Create order status transition guard
CREATE OR REPLACE FUNCTION public.validate_order_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE ok boolean := false;
BEGIN
  IF tg_op <> 'UPDATE' THEN
    RETURN new;
  END IF;

  IF new.status = old.status THEN
    RETURN new;
  END IF;

  IF new.status = 'Canceled' THEN
    RETURN new;
  END IF;

  IF (old.status, new.status) IN (
    ('ReadyForDispatch','Assigned'),
    ('Assigned','Accepted'),
    ('Accepted','PickedUp'),
    ('PickedUp','InTransit'),
    ('InTransit','Delivered')
  ) THEN ok := true; END IF;

  IF NOT ok THEN
    RAISE EXCEPTION 'illegal status transition % -> %', old.status, new.status;
  END IF;
  RETURN new;
END $$;

CREATE TRIGGER trg_orders_status
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_transition();

-- Create quote expiry function
CREATE OR REPLACE FUNCTION public.expire_quotes()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.quotes
  SET status = 'Expired'
  WHERE expires_at < now() AND coalesce(status, '') <> 'Expired';
END
$$;

-- Verify the unique constraint exists
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass
AND contype = 'u';
