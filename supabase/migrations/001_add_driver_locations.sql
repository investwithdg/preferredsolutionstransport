-- Migration: Add driver locations table for live tracking
-- Created: 2025-10-13

-- Create driver_locations table
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

-- Create indexes for performance
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

-- Enable Row Level Security
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy: Allow authenticated users to read their own location history
CREATE POLICY "Drivers can read their own locations"
  ON public.driver_locations
  FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Allow drivers to insert their own locations
CREATE POLICY "Drivers can insert their own locations"
  ON public.driver_locations
  FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Allow service role full access (for API endpoints)
CREATE POLICY "Service role has full access to locations"
  ON public.driver_locations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to clean up old location data (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_driver_locations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.driver_locations
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- Note: Uncomment if pg_cron is available
-- SELECT cron.schedule(
--   'cleanup-driver-locations',
--   '0 2 * * *', -- Run at 2 AM daily
--   'SELECT cleanup_old_driver_locations();'
-- );

COMMENT ON FUNCTION cleanup_old_driver_locations IS 'Removes driver location records older than 24 hours to save storage';

