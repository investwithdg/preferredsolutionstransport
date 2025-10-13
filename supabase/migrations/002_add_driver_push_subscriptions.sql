-- Add push subscription column to drivers table
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS push_subscription jsonb DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_push_subscription 
ON drivers ((push_subscription IS NOT NULL));
