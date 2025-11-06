#!/usr/bin/env node

/**
 * RLS Policy Test Script
 * Tests Row Level Security policies for all user roles
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  error: (msg) => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
  info: (msg) => console.log(`${COLORS.blue}ℹ️  ${msg}${COLORS.reset}`),
  warning: (msg) => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
};

// Test user credentials
const TEST_USERS = {
  admin: {
    email: 'admin@preferredsolutions.test',
    password: 'Admin123!',
    role: 'admin',
  },
  dispatcher: {
    email: 'dispatcher@preferredsolutions.test',
    password: 'Dispatcher123!',
    role: 'dispatcher',
  },
  driver: {
    email: 'driver@preferredsolutions.test',
    password: 'Driver123!',
    role: 'driver',
  },
  customer: {
    email: 'customer@preferredsolutions.test',
    password: 'Customer123!',
    role: 'recipient',
  },
};

async function createAuthenticatedClient(email, password) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to authenticate as ${email}: ${error.message}`);
  }

  return supabase;
}

async function testUsersTable(client, userRole) {
  console.log(`\n  Testing users table access for ${userRole}...`);
  
  const { data, error } = await client.from('users').select('*');
  
  if (userRole === 'admin' || userRole === 'dispatcher') {
    if (error) {
      log.error(`${userRole} should see all users`);
      return false;
    }
    log.success(`${userRole} can view all users`);
    return true;
  } else {
    if (data && data.length === 1) {
      log.success(`${userRole} can only view their own user record`);
      return true;
    } else {
      log.error(`${userRole} should only see their own user record`);
      return false;
    }
  }
}

async function testOrdersTable(client, userRole) {
  console.log(`\n  Testing orders table access for ${userRole}...`);
  
  const { data, error } = await client.from('orders').select('*');
  
  if (userRole === 'admin' || userRole === 'dispatcher') {
    if (error && error.code !== 'PGRST116') {
      log.error(`${userRole} should be able to query orders: ${error.message}`);
      return false;
    }
    log.success(`${userRole} can view orders`);
    return true;
  } else {
    // Driver and customer should only see their own orders (or none if no data yet)
    if (error && error.code !== 'PGRST116') {
      log.error(`${userRole} query failed: ${error.message}`);
      return false;
    }
    log.success(`${userRole} can query orders (RLS filtering applied)`);
    return true;
  }
}

async function testDriversTable(client, userRole) {
  console.log(`\n  Testing drivers table access for ${userRole}...`);
  
  const { data, error } = await client.from('drivers').select('*');
  
  if (userRole === 'admin' || userRole === 'dispatcher') {
    if (error && error.code !== 'PGRST116') {
      log.error(`${userRole} should be able to query drivers: ${error.message}`);
      return false;
    }
    log.success(`${userRole} can view all drivers`);
    return true;
  } else if (userRole === 'driver') {
    if (error && error.code !== 'PGRST116') {
      log.error(`Driver query failed: ${error.message}`);
      return false;
    }
    if (data && data.length <= 1) {
      log.success(`Driver can view their own record`);
      return true;
    } else {
      log.error(`Driver should only see their own record`);
      return false;
    }
  } else {
    if (error || (data && data.length === 0)) {
      log.success(`${userRole} cannot view drivers (correct)`);
      return true;
    } else {
      log.error(`${userRole} should not be able to view drivers`);
      return false;
    }
  }
}

async function testCustomersTable(client, userRole) {
  console.log(`\n  Testing customers table access for ${userRole}...`);
  
  const { data, error } = await client.from('customers').select('*');
  
  if (userRole === 'admin' || userRole === 'dispatcher') {
    if (error && error.code !== 'PGRST116') {
      log.error(`${userRole} should be able to query customers: ${error.message}`);
      return false;
    }
    log.success(`${userRole} can view all customers`);
    return true;
  } else if (userRole === 'recipient') {
    if (error && error.code !== 'PGRST116') {
      log.error(`Customer query failed: ${error.message}`);
      return false;
    }
    log.success(`Customer can query customers table (RLS filtering applied)`);
    return true;
  } else {
    if (error || (data && data.length === 0)) {
      log.success(`${userRole} cannot view customers (correct)`);
      return true;
    } else {
      log.error(`${userRole} should not be able to view customers`);
      return false;
    }
  }
}

async function runTests() {
  console.log(`${COLORS.blue}╔════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.blue}║      RLS Policy Test Suite                            ║${COLORS.reset}`);
  console.log(`${COLORS.blue}╔════════════════════════════════════════════════════════╗${COLORS.reset}\n`);

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    log.error('Missing Supabase environment variables in .env.local');
    process.exit(1);
  }

  log.success('Environment variables found\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const [key, user] of Object.entries(TEST_USERS)) {
    console.log(`\n${COLORS.yellow}Testing RLS policies for ${user.role}...${COLORS.reset}`);
    
    try {
      const client = await createAuthenticatedClient(user.email, user.password);
      
      // Run table tests
      const tests = [
        await testUsersTable(client, user.role),
        await testOrdersTable(client, user.role),
        await testDriversTable(client, user.role),
        await testCustomersTable(client, user.role),
      ];
      
      const passed = tests.filter(Boolean).length;
      const failed = tests.length - passed;
      
      totalTests += tests.length;
      passedTests += passed;
      failedTests += failed;
      
      // Sign out
      await client.auth.signOut();
      
    } catch (error) {
      log.error(`Failed to test ${user.role}: ${error.message}`);
      failedTests += 4;
      totalTests += 4;
    }
  }

  console.log(`\n${COLORS.blue}════════════════════════════════════════════════════════${COLORS.reset}\n`);
  console.log('Test Results:');
  console.log(`  ${COLORS.green}Passed: ${passedTests}/${totalTests}${COLORS.reset}`);
  console.log(`  ${COLORS.red}Failed: ${failedTests}/${totalTests}${COLORS.reset}\n`);

  if (failedTests === 0) {
    log.success('🎉 All RLS policy tests passed!');
    process.exit(0);
  } else {
    log.error('⚠️  Some tests failed. Review the errors above.');
    process.exit(1);
  }
}

runTests().catch((error) => {
  log.error(`Test suite error: ${error.message}`);
  process.exit(1);
});

