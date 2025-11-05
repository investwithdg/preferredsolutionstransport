-- =============================================================================
-- Fix drivers.user_id to reference public.users instead of auth.users
-- =============================================================================
--
-- ISSUE: drivers.user_id currently references auth.users(id), but the app
-- uses public.users as the main user table with role information.
-- This causes RLS policy failures and prevents drivers from accessing their UI.
--
-- SOLUTION: Change foreign key to reference public.users(id) and update
-- RLS policies to match.
-- =============================================================================

BEGIN;

-- Step 1: Drop existing foreign key constraint
ALTER TABLE public.drivers
  DROP CONSTRAINT IF EXISTS drivers_user_id_fkey;

-- Step 2: Update existing driver records to use public.users.id
-- Map drivers.user_id from auth.users.id to public.users.id
UPDATE public.drivers d
SET user_id = u.id
FROM public.users u
WHERE d.user_id = u.auth_id
  AND d.user_id IS NOT NULL;

-- Step 3: Add new foreign key constraint referencing public.users
ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- Step 4: Update RLS policies to work with new relationship
-- Drop old policies
DROP POLICY IF EXISTS "Drivers manage own profile" ON public.drivers;
DROP POLICY IF EXISTS "Drivers view all driver profiles" ON public.drivers;
DROP POLICY IF EXISTS "Drivers view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers update assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers view own dispatch events" ON public.dispatch_events;
DROP POLICY IF EXISTS "Drivers can read their own locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can insert their own locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can insert their PoD" ON public.delivery_proof;
DROP POLICY IF EXISTS "Drivers can view their PoD" ON public.delivery_proof;

-- Step 5: Create new RLS policies using public.users relationship
-- Drivers can manage their own profile
CREATE POLICY "Drivers manage own profile"
  ON public.drivers FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE auth_id = auth.uid()
    )
  );

-- Drivers can view all driver profiles (for reference in dispatcher view)
CREATE POLICY "Drivers view all driver profiles"
  ON public.drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'driver'
    )
  );

-- Drivers can view orders assigned to them
CREATE POLICY "Drivers view assigned orders"
  ON public.orders FOR SELECT
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Drivers can update status of orders assigned to them
CREATE POLICY "Drivers update assigned orders"
  ON public.orders FOR UPDATE
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Drivers can view dispatch events for their orders
CREATE POLICY "Drivers view own dispatch events"
  ON public.dispatch_events FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.drivers d ON d.id = o.driver_id
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Drivers can read their own location history
CREATE POLICY "Drivers can read their own locations"
  ON public.driver_locations FOR SELECT
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Drivers can insert their own locations
CREATE POLICY "Drivers can insert their own locations"
  ON public.driver_locations FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Drivers can insert their own PoD
CREATE POLICY "Drivers can insert their PoD"
  ON public.delivery_proof FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Drivers can view their own PoD
CREATE POLICY "Drivers can view their PoD"
  ON public.delivery_proof FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Step 6: Update storage policies for proof-of-delivery bucket
DROP POLICY IF EXISTS "Drivers can upload PoD files" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can update their PoD files" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can delete their PoD files" ON storage.objects;

CREATE POLICY "Drivers can upload PoD files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proof-of-delivery'
    AND (storage.foldername(name))[1] IN (
      SELECT d.id::text FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update their PoD files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'proof-of-delivery'
    AND (storage.foldername(name))[1] IN (
      SELECT d.id::text FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can delete their PoD files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proof-of-delivery'
    AND (storage.foldername(name))[1] IN (
      SELECT d.id::text FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

COMMIT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'MIGRATION COMPLETE: Fixed drivers.user_id foreign key';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ drivers.user_id now references public.users(id) instead of auth.users(id)';
  RAISE NOTICE '  ✓ Updated all RLS policies to use public.users relationship';
  RAISE NOTICE '  ✓ Migrated existing driver records to new schema';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update application code to use public.users.id for driver creation';
  RAISE NOTICE '  2. Test driver login and UI access';
  RAISE NOTICE '=============================================================================';
END $$;
