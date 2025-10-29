-- Add hubspot_metadata column to orders for storing dispatcher-facing details
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS hubspot_metadata jsonb DEFAULT '{}'::jsonb;
