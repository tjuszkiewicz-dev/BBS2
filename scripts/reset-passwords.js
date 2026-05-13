#!/usr/bin/env node

/**
 * Script to reset passwords for all test accounts to "123"
 * Usage: node scripts/reset-passwords.js
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const accounts = [
  { email: 'biuro@balticbenefits.pl', role: 'superadmin' },
  { email: 't.juszkiewicz@gmail.com', role: 'pracodawca' },
  { email: 'vcx@wp.pl', role: 'pracownik' },
  { email: 'dlkso@wp.pl', role: 'pracownik' }
];

const NEW_PASSWORD = '123';

async function resetPasswords() {
  console.log('🔐 Resetting passwords for all test accounts...\n');

  // First, get all users
  const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }

  for (const account of accounts) {
    try {
      // Find user by email
      const user = allUsers.users.find(u => u.email === account.email);

      if (!user) {
        console.error(`❌ ${account.email}: User not found`);
        continue;
      }

      // Update password
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: NEW_PASSWORD
      });

      if (error) throw error;
      console.log(`✅ ${account.email} (${account.role}): password → "${NEW_PASSWORD}"`);
    } catch (err) {
      console.error(`❌ ${account.email}: ${err.message}`);
    }
  }

  console.log('\n✨ Done!');
}

resetPasswords();
