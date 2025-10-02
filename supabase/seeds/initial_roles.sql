-- Initial role mappings and demo data seeding
--
-- Usage:
-- 1) Create or invite users in Supabase Auth with the emails below
-- 2) Update the emails to your real users
-- 3) Run this file in the Supabase SQL Editor

-- Upsert users with roles into public.users (links to auth.users via auth_id)
-- Note: If you already have auth users, replace the email filters to match

-- Admin
INSERT INTO public.users (auth_id, email, role)
SELECT au.id, au.email, 'admin'::user_role
FROM auth.users au
WHERE au.email = 'admin@example.com'
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- Dispatcher
INSERT INTO public.users (auth_id, email, role)
SELECT au.id, au.email, 'dispatcher'::user_role
FROM auth.users au
WHERE au.email = 'dispatcher@example.com'
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- Driver
INSERT INTO public.users (auth_id, email, role)
SELECT au.id, au.email, 'driver'::user_role
FROM auth.users au
WHERE au.email = 'driver@example.com'
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- Recipient
INSERT INTO public.users (auth_id, email, role)
SELECT au.id, au.email, 'recipient'::user_role
FROM auth.users au
WHERE au.email = 'recipient@example.com'
ON CONFLICT (auth_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- Link driver profile to the driver auth user (assuming a driver row exists)
-- If no driver exists, create one below first
DO $$
DECLARE v_driver_auth uuid;
BEGIN
  SELECT id INTO v_driver_auth FROM auth.users WHERE email = 'driver@example.com';
  IF v_driver_auth IS NOT NULL THEN
    UPDATE public.drivers
    SET user_id = v_driver_auth
    WHERE user_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
END $$;

-- Ensure recipient mapping via customers.auth_email
UPDATE public.customers
SET auth_email = 'recipient@example.com'
WHERE auth_email IS NULL
ORDER BY created_at ASC
LIMIT 1;

-- Notices
DO $$
BEGIN
  RAISE NOTICE 'Seed complete. Update emails in supabase/seeds/initial_roles.sql to your real users and re-run as needed.';
END $$;


