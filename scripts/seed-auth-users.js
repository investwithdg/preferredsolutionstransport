#!/usr/bin/env node

/**
 * Seed Auth Users via Supabase Admin API (service role)
 * - Creates/updates 4 users (admin, dispatcher, driver, customer)
 * - Confirms emails
 * - Upserts into public.users with roles
 * - Ensures driver/customer domain records exist
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: 'admin@preferredsolutions.test', password: 'Admin123!', role: 'admin' },
  { email: 'dispatcher@preferredsolutions.test', password: 'Dispatcher123!', role: 'dispatcher' },
  { email: 'driver@preferredsolutions.test', password: 'Driver123!', role: 'driver' },
  { email: 'customer@preferredsolutions.test', password: 'Customer123!', role: 'recipient' },
];

async function ensureAuthUser(email, password) {
  // Check if user exists
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());

  if (existing) {
    // Update password and confirm email
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return data.user;
  }

  // Create fresh user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function upsertPublicUser(authUserId, email, role) {
  const { data, error } = await supabase
    .from('users')
    .upsert({ auth_id: authUserId, email, role }, { onConflict: 'auth_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureDriver(userId) {
  // Ensure driver record exists for driver role
  const { data: existing, error: selErr } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('drivers')
    .insert({ name: 'Test Driver', phone: '555-0001', vehicle_details: 'White Ford Transit Van', user_id: userId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureCustomer(email) {
  // Ensure a basic customer row for the customer user
  const { data: existing, error: selErr } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('customers')
    .insert({ email, name: 'Test Customer', phone: '555-0002' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  console.log('Seeding auth users via service role...');
  for (const u of USERS) {
    console.log(`\n→ ${u.email} (${u.role})`);
    const authUser = await ensureAuthUser(u.email, u.password);
    console.log(`  - Auth user id: ${authUser.id}`);

    const publicUserId = await upsertPublicUser(authUser.id, u.email, u.role);
    console.log(`  - public.users id: ${publicUserId}`);

    if (u.role === 'driver') {
      const driverId = await ensureDriver(publicUserId);
      console.log(`  - drivers id: ${driverId}`);
    }

    if (u.role === 'recipient') {
      const customerId = await ensureCustomer(u.email);
      console.log(`  - customers id: ${customerId}`);
    }
  }

  console.log('\n✅ Done. You can now sign in with the test users.');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});


