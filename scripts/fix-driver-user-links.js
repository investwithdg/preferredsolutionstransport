#!/usr/bin/env node

/**
 * Fix Driver User Links
 * 
 * This script fixes existing driver records that are missing the user_id field.
 * It matches drivers to users by email/name and updates the user_id accordingly.
 * 
 * Run with: node scripts/fix-driver-user-links.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixDriverUserLinks() {
  console.log('🔍 Finding driver records without user_id...\n');

  try {
    // Get all drivers with missing user_id
    const { data: driversWithoutUserId, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .is('user_id', null);

    if (driversError) {
      throw new Error(\`Failed to fetch drivers: \${driversError.message}\`);
    }

    if (!driversWithoutUserId || driversWithoutUserId.length === 0) {
      console.log('✅ All driver records have user_id set. No fixes needed!');
      return;
    }

    console.log(\`📋 Found \${driversWithoutUserId.length} driver(s) without user_id:\n\`);

    // Get all users with driver role
    const { data: driverUsers, error: usersError } = await supabase
      .from('users')
      .select('id, auth_id, email, role')
      .eq('role', 'driver');

    if (usersError) {
      throw new Error(\`Failed to fetch users: \${usersError.message}\`);
    }

    console.log(\`👥 Found \${driverUsers?.length || 0} user(s) with driver role\n\`);

    // Get auth user details for matching
    const authUserMap = new Map();
    for (const user of driverUsers || []) {
      if (user.auth_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(user.auth_id);
        if (authUser?.user) {
          authUserMap.set(user.id, {
            publicUserId: user.id,
            email: authUser.user.email,
            name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0],
            phone: authUser.user.user_metadata?.phone,
          });
        }
      }
    }

    let fixedCount = 0;
    let skippedCount = 0;

    // Try to match drivers to users
    for (const driver of driversWithoutUserId) {
      console.log(\`\n🔧 Processing driver: \${driver.name} (\${driver.phone})\`);

      // Try to find a matching user
      let matchedUserId = null;

      // Strategy 1: Match by phone if available
      if (driver.phone) {
        for (const [userId, authInfo] of authUserMap.entries()) {
          if (authInfo.phone === driver.phone) {
            matchedUserId = userId;
            console.log(\`   ✓ Matched by phone: \${authInfo.email}\`);
            break;
          }
        }
      }

      // Strategy 2: Match by name if no phone match
      if (!matchedUserId) {
        for (const [userId, authInfo] of authUserMap.entries()) {
          if (authInfo.name === driver.name) {
            matchedUserId = userId;
            console.log(\`   ✓ Matched by name: \${authInfo.email}\`);
            break;
          }
        }
      }

      // Strategy 3: If only one driver user without a driver record, assume it's them
      if (!matchedUserId && driverUsers?.length === 1 && driversWithoutUserId.length === 1) {
        matchedUserId = driverUsers[0].id;
        const authInfo = authUserMap.get(matchedUserId);
        console.log(\`   ✓ Only one unmatched driver user, assuming match: \${authInfo?.email}\`);
      }

      if (matchedUserId) {
        // Update the driver record
        const { error: updateError } = await supabase
          .from('drivers')
          .update({ user_id: matchedUserId })
          .eq('id', driver.id);

        if (updateError) {
          console.log(\`   ❌ Failed to update: \${updateError.message}\`);
          skippedCount++;
        } else {
          console.log(\`   ✅ Successfully linked to user_id: \${matchedUserId}\`);
          fixedCount++;
          authUserMap.delete(matchedUserId); // Remove from available matches
        }
      } else {
        console.log(\`   ⚠️  No matching user found - skipping\`);
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(\`\n📊 Summary:\`);
    console.log(\`   ✅ Fixed: \${fixedCount}\`);
    console.log(\`   ⚠️  Skipped: \${skippedCount}\`);
    console.log(\`   📋 Total processed: \${driversWithoutUserId.length}\n\`);

    if (skippedCount > 0) {
      console.log('⚠️  Some driver records could not be automatically matched.');
      console.log('   You may need to manually update these records in the database.\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
fixDriverUserLinks()
  .then(() => {
    console.log('✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
