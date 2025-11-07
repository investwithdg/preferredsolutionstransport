-- ============================================================================
-- Fix Driver User Links
-- This migration updates existing driver records to link them with user records
-- ============================================================================

-- First, let's see if there are any drivers without user_id
DO $$ 
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count 
  FROM public.drivers 
  WHERE user_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % driver(s) without user_id', orphan_count;
  ELSE
    RAISE NOTICE 'All drivers already have user_id set';
  END IF;
END $$;

-- Update drivers that don't have a user_id by matching on name/phone
-- This is a best-effort attempt and may need manual review

-- Strategy 1: Match drivers to users by checking if there's a user with 
-- driver role whose auth.users metadata matches the driver's phone
-- Note: This requires the auth.users metadata to have been set correctly during signup

-- For now, we'll create a function to help manual linking
-- Users should manually update driver records using:
-- UPDATE public.drivers 
-- SET user_id = (SELECT id FROM public.users WHERE auth_id = 'auth-user-id-here')
-- WHERE id = 'driver-id-here';

-- Create a helper view to see unlinked drivers and potential matches
CREATE OR REPLACE VIEW public.unlinked_drivers_report AS
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  d.phone AS driver_phone,
  d.created_at AS driver_created_at,
  u.id AS potential_user_id,
  u.email AS user_email,
  u.auth_id AS user_auth_id,
  u.role AS user_role,
  CASE 
    WHEN u.id IS NULL THEN 'No driver role user found'
    ELSE 'Potential match found'
  END AS status
FROM public.drivers d
LEFT JOIN public.users u ON u.role = 'driver' AND u.id NOT IN (
  SELECT user_id FROM public.drivers WHERE user_id IS NOT NULL
)
WHERE d.user_id IS NULL
ORDER BY d.created_at DESC;

-- Grant access to this view
GRANT SELECT ON public.unlinked_drivers_report TO authenticated;

COMMENT ON VIEW public.unlinked_drivers_report IS 
'Helper view to identify driver records that need to be linked to user records. Review this view and manually update the drivers table to link drivers to users.';
