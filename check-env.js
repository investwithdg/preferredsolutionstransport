#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Environment Variables Check ===\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

console.log(`1. .env.local file exists: ${envExists ? '✓' : '✗'}`);

if (!envExists) {
  console.log('\n❌ ERROR: .env.local file not found!');
  console.log('   Please create a .env.local file in the root directory.');
  console.log('   Copy env.example to .env.local and fill in your values.\n');
  process.exit(1);
}

// Load .env.local
require('dotenv').config({ path: envPath });

// Check required Supabase variables
const requiredVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
};

console.log('\n2. Required Environment Variables:\n');

let hasErrors = false;

for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    console.log(`   ${key}: ✗ MISSING`);
    hasErrors = true;
  } else {
    // Show partial values for security
    let displayValue = value;
    if (key.includes('KEY')) {
      displayValue = value.substring(0, 10) + '...' + ` (${value.length} chars)`;
    } else if (key.includes('URL')) {
      try {
        const url = new URL(value);
        displayValue = url.hostname;
      } catch {
        displayValue = 'INVALID URL';
        hasErrors = true;
      }
    }
    console.log(`   ${key}: ✓ ${displayValue}`);
  }
}

// Validate Supabase URL format
if (requiredVars.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    new URL(requiredVars.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    console.log('\n❌ ERROR: NEXT_PUBLIC_SUPABASE_URL is not a valid URL!');
    console.log(`   Current value: "${requiredVars.NEXT_PUBLIC_SUPABASE_URL}"`);
    console.log('   Expected format: https://your-project-ref.supabase.co');
    hasErrors = true;
  }
}

// Check for common mistakes
console.log('\n3. Common Issues Check:\n');

if (requiredVars.NEXT_PUBLIC_SUPABASE_URL?.includes('your_supabase_project_url')) {
  console.log('   ❌ NEXT_PUBLIC_SUPABASE_URL still has placeholder value');
  hasErrors = true;
}

if (requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('your_supabase_anon_key')) {
  console.log('   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY still has placeholder value');
  hasErrors = true;
}

if (!hasErrors) {
  console.log('   ✓ No common issues detected');
}

// Summary
console.log('\n=== Summary ===\n');

if (hasErrors) {
  console.log('❌ Environment configuration has errors. Please fix the issues above.\n');
  console.log('To fix:');
  console.log('1. Copy env.example to .env.local if you haven\'t already');
  console.log('2. Get your Supabase URL and keys from: https://app.supabase.com/project/_/settings/api');
  console.log('3. Get your Google Maps API key from: https://console.cloud.google.com/apis/credentials');
  console.log('4. Update the values in .env.local');
  console.log('5. Restart your Next.js development server\n');
} else {
  console.log('✓ All required environment variables are set!\n');
  console.log('If you\'re still having issues:');
  console.log('1. Make sure to restart your Next.js server after updating .env.local');
  console.log('2. Clear your browser cache and cookies');
  console.log('3. Check the browser console for any client-side errors\n');
}
