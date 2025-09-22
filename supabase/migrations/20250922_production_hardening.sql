-- Production Hardening Migration
-- This migration adds additional security, monitoring, and performance improvements
-- for production deployment.

-- Step 1: Enhanced RLS Policies for Least Privilege Access

-- Deny all access by default (security baseline)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  DENY ALL ON TABLES TO PUBLIC;

-- Customers table: Restrict to service role and authenticated customers only
DROP POLICY IF EXISTS "Service role or owner access to customers" ON public.customers;
CREATE POLICY "Least privilege customers access"
  ON public.customers FOR ALL
  USING (
    -- Service role for API operations
    auth.jwt() ->> 'role' = 'service_role' OR
    -- Customers can only see their own record
    (auth.role() = 'authenticated' AND auth.uid()::text = id::text)
  );

-- Quotes table: Restrict to service role and quote owners only
DROP POLICY IF EXISTS "Service role or customer access to quotes" ON public.quotes;
CREATE POLICY "Least privilege quotes access"
  ON public.quotes FOR ALL
  USING (
    -- Service role for API operations
    auth.jwt() ->> 'role' = 'service_role' OR
    -- Customers can only see their own quotes
    (auth.role() = 'authenticated' AND auth.uid()::text = customer_id::text)
  );

-- Orders table: More restrictive policies for different roles
DROP POLICY IF EXISTS "Authenticated read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers see their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers update their assigned orders" ON public.orders;

-- Orders: Service role full access
CREATE POLICY "Service role full access to orders"
  ON public.orders FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Orders: Customers can see their own orders
CREATE POLICY "Customers can view their own orders"
  ON public.orders FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    auth.uid()::text = customer_id::text
  );

-- Orders: Drivers can see and update their assigned orders
CREATE POLICY "Drivers access their assigned orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid() AND drivers.id = orders.driver_id
    )
  );

-- Dispatch events: Read-only for authenticated users, full access for service role
DROP POLICY IF EXISTS "Service role full access dispatch_events" ON public.dispatch_events;
CREATE POLICY "Service role full access to dispatch_events"
  ON public.dispatch_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated users can read dispatch_events"
  ON public.dispatch_events FOR SELECT
  USING (auth.role() = 'authenticated');

-- Webhook events: Service role only (internal audit trail)
DROP POLICY IF EXISTS "Service role full access webhook_events" ON public.webhook_events;
CREATE POLICY "Service role full access to webhook_events"
  ON public.webhook_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Drivers table: Restrict access appropriately
DROP POLICY IF EXISTS "Drivers view their own record" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated users view all drivers" ON public.drivers;

CREATE POLICY "Service role full access to drivers"
  ON public.drivers FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Drivers can view and update their own record"
  ON public.drivers FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view driver profiles"
  ON public.drivers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 2: Additional Security Constraints

-- Ensure all required fields are not null
ALTER TABLE public.customers
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.quotes
  ALTER COLUMN pickup_address SET NOT NULL,
  ALTER COLUMN dropoff_address SET NOT NULL,
  ALTER COLUMN distance_mi SET NOT NULL,
  ALTER COLUMN pricing SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.orders
  ALTER COLUMN price_total SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Add check constraints for data quality
ALTER TABLE public.quotes
  ADD CONSTRAINT check_positive_distance
  CHECK (distance_mi > 0),
  ADD CONSTRAINT check_positive_weight
  CHECK (weight_lb IS NULL OR weight_lb > 0),
  ADD CONSTRAINT check_valid_pricing
  CHECK (pricing->>'total' IS NOT NULL AND (pricing->>'total')::numeric >= 0);

ALTER TABLE public.orders
  ADD CONSTRAINT check_positive_price
  CHECK (price_total > 0);

-- Step 3: Performance Indexes for Production

-- Additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_quotes_status_created ON public.quotes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON public.orders(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_stripe_session ON public.quotes(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- Partial indexes for active orders (performance optimization)
CREATE INDEX IF NOT EXISTS idx_orders_active_status ON public.orders(status) WHERE status NOT IN ('Delivered', 'Canceled');
CREATE INDEX IF NOT EXISTS idx_quotes_active ON public.quotes(id, status) WHERE status = 'Draft' AND expires_at > now();

-- Step 4: Monitoring and Audit Functions

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
    -- Orders stuck in processing states
    SELECT 'warning' as alert_type,
           'Orders stuck in non-terminal states > 24h' as alert_message,
           count(*) as alert_count
    FROM public.orders
    WHERE status NOT IN ('Delivered', 'Canceled')
      AND updated_at < now() - interval '24 hours'

    UNION ALL

    -- Unprocessed webhook events
    SELECT 'error' as alert_type,
           'Webhook events not processed' as alert_message,
           count(*) as alert_count
    FROM public.webhook_events
    WHERE processed_at IS NULL
      AND created_at < now() - interval '1 hour'

    UNION ALL

    -- Duplicate customers (shouldn't happen with unique constraint)
    SELECT 'warning' as alert_type,
           'Potential duplicate customers' as alert_message,
           count(*) - count(distinct email) as alert_count
    FROM public.customers
    WHERE email IS NOT NULL
  ) alerts
  WHERE alert_count > 0;

  RETURN result;
END $$;

-- Step 5: Rate Limiting Infrastructure

-- Table to track API request counts for rate limiting
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS to rate limits table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

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

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_limit integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  current_count integer;
  window_start timestamptz;
BEGIN
  -- Calculate window start
  window_start := date_trunc('minute', now()) - (p_window_minutes || ' minutes')::interval;

  -- Get current count for this identifier and endpoint
  SELECT request_count INTO current_count
  FROM public.api_rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start >= window_start;

  -- If no record exists or count is below limit, allow request
  IF current_count IS NULL THEN
    INSERT INTO public.api_rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, window_start);
    RETURN true;
  ELSIF current_count < p_limit THEN
    UPDATE public.api_rate_limits
    SET request_count = request_count + 1,
        updated_at = now()
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start >= window_start;
    RETURN true;
  ELSE
    -- Rate limit exceeded
    RETURN false;
  END IF;
END $$;

-- Step 6: Add comments for production documentation
COMMENT ON FUNCTION public.get_system_health() IS 'Returns system health metrics for monitoring';
COMMENT ON FUNCTION public.get_system_alerts() IS 'Returns potential system issues for alerting';
COMMENT ON FUNCTION public.check_rate_limit(text, text, integer, integer) IS 'Rate limiting function for API endpoints';
COMMENT ON TABLE public.api_rate_limits IS 'Tracks API request counts for rate limiting';
