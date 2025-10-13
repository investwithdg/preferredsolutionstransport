-- =============================================================================
-- Phase 3 Migrations - Driver Locations & Push Notifications
-- Run this AFTER the consolidated schema
-- =============================================================================

-- 1. Create driver_locations table (if not exists)
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  accuracy decimal,
  heading decimal,
  speed decimal,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT valid_heading CHECK (heading IS NULL OR (heading >= 0 AND heading <= 360))
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id 
  ON public.driver_locations(driver_id);
  
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id 
  ON public.driver_locations(order_id);
  
CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at 
  ON public.driver_locations(created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_order 
  ON public.driver_locations(driver_id, order_id, created_at DESC);

-- Add comment
COMMENT ON TABLE public.driver_locations IS 'Real-time driver location tracking for live order updates';

-- Enable RLS if not already enabled
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Drivers can read their own locations" ON public.driver_locations;
CREATE POLICY "Drivers can read their own locations"
  ON public.driver_locations
  FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Drivers can insert their own locations" ON public.driver_locations;
CREATE POLICY "Drivers can insert their own locations"
  ON public.driver_locations
  FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role has full access to locations" ON public.driver_locations;
CREATE POLICY "Service role has full access to locations"
  ON public.driver_locations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_driver_locations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.driver_locations
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

COMMENT ON FUNCTION cleanup_old_driver_locations IS 'Removes driver location records older than 24 hours to save storage';

-- 2. Add push subscription column to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS push_subscription jsonb DEFAULT NULL;

-- Add index for push subscriptions
CREATE INDEX IF NOT EXISTS idx_drivers_push_subscription 
  ON public.drivers ((push_subscription IS NOT NULL));

-- Verify everything was created successfully
DO $$
BEGIN
  -- Check if driver_locations table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_locations') THEN
    RAISE EXCEPTION 'driver_locations table was not created';
  END IF;
  
  -- Check if push_subscription column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'drivers' AND column_name = 'push_subscription') THEN
    RAISE EXCEPTION 'push_subscription column was not added to drivers table';
  END IF;
  
  RAISE NOTICE 'Phase 3 migrations completed successfully!';
END $$;
