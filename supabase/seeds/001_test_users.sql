-- ============================================================================
-- Test Users Seed Data
-- Creates 4 test accounts (one per role) for development
-- ============================================================================

-- IMPORTANT: These are test accounts for development only.
-- DO NOT use these credentials in production.

-- ============================================================================
-- Test User Credentials:
-- 
-- Admin:      admin@preferredsolutions.test / Admin123!
-- Dispatcher: dispatcher@preferredsolutions.test / Dispatcher123!
-- Driver:     driver@preferredsolutions.test / Driver123!
-- Customer:   customer@preferredsolutions.test / Customer123!
-- ============================================================================

-- Note: Supabase Auth requires passwords to be hashed using crypt()
-- We'll create users in auth.users and then link them to public.users

-- Insert test users into auth.users table
-- Password: Admin123! (hashed with crypt extension)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@preferredsolutions.test',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin User"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Password: Dispatcher123!
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'dispatcher@preferredsolutions.test',
  crypt('Dispatcher123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Dispatcher User"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Password: Driver123!
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'driver@preferredsolutions.test',
  crypt('Driver123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Driver User"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Password: Customer123!
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'customer@preferredsolutions.test',
  crypt('Customer123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Customer User"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create corresponding records in public.users with roles
INSERT INTO public.users (id, auth_id, email, role, created_at) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@preferredsolutions.test',
    'admin',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'dispatcher@preferredsolutions.test',
    'dispatcher',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'driver@preferredsolutions.test',
    'driver',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    'customer@preferredsolutions.test',
    'recipient',
    now()
  )
ON CONFLICT (auth_id) DO NOTHING;

-- Create driver record for driver account
INSERT INTO public.drivers (id, name, phone, vehicle_details, user_id, created_at) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'Test Driver',
    '555-0001',
    'White Ford Transit Van',
    '10000000-0000-0000-0000-000000000003',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Create customer record for recipient account
INSERT INTO public.customers (id, email, name, phone, created_at) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    'customer@preferredsolutions.test',
    'Test Customer',
    '555-0002',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Create identities for email auth (required for Supabase Auth to work properly)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@preferredsolutions.test"}',
    'email',
    'admin@preferredsolutions.test',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"dispatcher@preferredsolutions.test"}',
    'email',
    'dispatcher@preferredsolutions.test',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"driver@preferredsolutions.test"}',
    'email',
    'driver@preferredsolutions.test',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    '{"sub":"00000000-0000-0000-0000-000000000004","email":"customer@preferredsolutions.test"}',
    'email',
    'customer@preferredsolutions.test',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;
