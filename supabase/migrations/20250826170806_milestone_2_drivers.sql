-- Milestone 2: Driver Management & Actions + Security Hardening
-- This migration adds the necessary schema for drivers and order assignments,
-- plus security improvements and additional constraints.

-- Step 1: Create the drivers table
-- This table will store public-facing information about drivers.
-- Authentication is handled by Supabase Auth, linking via the user_id.
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  name text NOT NULL,
  phone text,
  vehicle_details jsonb, -- { "make": "Ford", "model": "Transit", "license_plate": "ABC1234" }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for the new drivers table
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Allow service roles full access to drivers table
CREATE POLICY "Allow service role full access to drivers"
ON public.drivers FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Allow drivers to view their own record
CREATE POLICY "Allow drivers to view their own record"
ON public.drivers FOR SELECT
USING (auth.uid() = user_id);

-- Allow dispatchers/admins to see all drivers (placeholder for now)
-- In a future milestone, this would be restricted to specific roles.
CREATE POLICY "Allow authenticated users to view all drivers"
ON public.drivers FOR SELECT
USING (auth.role() = 'authenticated');


-- Step 2: Add driver_id to the orders table
-- This links an order to a specific driver for assignment.
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id);

-- Create an index for efficient lookup of a driver's orders
CREATE INDEX IF NOT EXISTS idx_orders_driver_id
ON public.orders (driver_id);


-- Step 3: Update RLS policies for the orders table
-- We need to allow drivers to see and update orders assigned to them.

-- First, drop the temporary anonymous read policy from M1
DROP POLICY IF EXISTS "Allow anonymous read orders" ON public.orders;

-- Allow dispatchers/admins to see all orders (placeholder for now)
CREATE POLICY "Allow authenticated read access to orders"
ON public.orders FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow drivers to see orders assigned to them
CREATE POLICY "Allow drivers to see their assigned orders"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers
    WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
  )
);

-- Allow drivers to update the status of their assigned orders
-- Note: The actual status transition logic is handled by a trigger,
-- this policy just grants the permission to update.
CREATE POLICY "Allow drivers to update their assigned orders"
ON public.orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.drivers
    WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
  )
);

-- Step 4: Add trigger to update the 'updated_at' timestamp for drivers table
CREATE TRIGGER update_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
<<<<<<< Current (Your changes)
=======

-- Step 5: Security Hardening - Additional Constraints and Indexes

-- Ensure customers.email uniqueness is enforced (should already exist from base schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'customers_email_key'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_email_key UNIQUE (email);
  END IF;
END $$;

-- Add additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON public.quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_quote_id ON public.orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- Step 6: Additional RLS Policy Improvements
-- These policies provide better security by being more restrictive

-- Customers table: Only allow users to insert/update their own data
-- (for future when customers have user accounts)
DROP POLICY IF EXISTS "Anonymous insert customers" ON public.customers;
CREATE POLICY "Service role or owner access to customers"
  ON public.customers FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.uid() = id
  );

-- Quotes table: More restrictive - only allow access to user's own quotes
DROP POLICY IF EXISTS "Anonymous insert quotes" ON public.quotes;
CREATE POLICY "Service role or customer access to quotes"
  ON public.quotes FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.uid()::text = customer_id::text
  );

-- Step 7: Function to clean up expired quotes (runs automatically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_quotes()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Delete expired quotes older than 30 days
  DELETE FROM public.quotes
  WHERE expires_at < now() - interval '30 days'
    AND status = 'Expired';
END $$;

-- Step 8: Add comments for documentation
COMMENT ON TABLE public.customers IS 'Customer information - email uniqueness enforced';
COMMENT ON TABLE public.quotes IS 'Quote requests with pricing - expires after 24 hours';
COMMENT ON TABLE public.orders IS 'Orders created after successful payment';
COMMENT ON TABLE public.drivers IS 'Driver profiles linked to Supabase Auth users';
COMMENT ON TABLE public.dispatch_events IS 'Audit trail for all system events - append only';
COMMENT ON TABLE public.webhook_events IS 'Stripe webhook events for idempotency';
>>>>>>> Incoming (Background Agent changes)
