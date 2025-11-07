-- ============================================================================
-- Add Unique Constraint to drivers.user_id
-- This ensures each user can only have one driver record
-- ============================================================================

-- Add unique constraint to drivers.user_id
ALTER TABLE public.drivers
ADD CONSTRAINT drivers_user_id_unique UNIQUE (user_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT drivers_user_id_unique ON public.drivers IS
'Ensures each user can only have one driver record';
