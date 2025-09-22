-- Auth + RLS Hardening
-- 1) users table linked to auth.users
-- 2) roles and helper
-- 3) policies for admin/dispatcher, driver, recipient

-- Role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','dispatcher','driver','recipient');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id),
  email text UNIQUE,
  role user_role,
  created_at timestamptz DEFAULT now()
);

-- Helper to return current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies
-- Service role full access
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users"
  ON public.users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can select/update their own record
DROP POLICY IF EXISTS "Users manage own record" ON public.users;
CREATE POLICY "Users manage own record"
  ON public.users FOR SELECT USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Admin/dispatcher full access to operational tables
-- Helper predicates
CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT public.current_user_role() IN ('admin','dispatcher');
$$;

-- Orders
DROP POLICY IF EXISTS "Admin dispatcher full orders" ON public.orders;
CREATE POLICY "Admin dispatcher full orders"
  ON public.orders FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- Dispatch events
DROP POLICY IF EXISTS "Admin dispatcher full dispatch_events" ON public.dispatch_events;
CREATE POLICY "Admin dispatcher full dispatch_events"
  ON public.dispatch_events FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- Drivers self-view already covered in consolidated schema; allow admin/dispatcher full
DROP POLICY IF EXISTS "Admin dispatcher full drivers" ON public.drivers;
CREATE POLICY "Admin dispatcher full drivers"
  ON public.drivers FOR ALL
  USING (public.is_admin_or_dispatcher())
  WITH CHECK (public.is_admin_or_dispatcher());

-- Driver restrictions: read/update only their assigned orders (kept from consolidated schema)
-- Ensure updates limited to status only via trigger already present; policy is generic UPDATE

-- Recipient read-only: tie orders to customer email in users table
-- Add nullable auth_email on customers for mapping (if not exists)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_email text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_customers_auth_email ON public.customers(auth_email);

-- Allow authenticated recipients to read their own orders via customers.auth_email = auth.email()
DROP POLICY IF EXISTS "Recipients read own orders" ON public.orders;
CREATE POLICY "Recipients read own orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = orders.customer_id AND c.auth_email = auth.email()
    )
  );

-- Allow recipients to read their own dispatch_events
DROP POLICY IF EXISTS "Recipients read own dispatch_events" ON public.dispatch_events;
CREATE POLICY "Recipients read own dispatch_events"
  ON public.dispatch_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE o.id = dispatch_events.order_id AND c.auth_email = auth.email()
    )
  );

-- Note: Proof of delivery storage policies configured in Supabase Storage UI; table not used here

-- Ensure PostgREST cache reload
NOTIFY pgrst, 'reload schema';


