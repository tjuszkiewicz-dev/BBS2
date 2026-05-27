// One-shot: utworzenie konta Piotr Felcman (rola: partner).
// Uruchom: node scripts/create-user-partner-piotr.mjs
// Wymaga: .env.local z NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ── wczytaj .env.local ───────────────────────────────────────────────────────
const envPath = path.resolve('.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Brak .env.local');
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let [, k, v] = m;
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vogyfffzlucppmddqsqw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('Brak SUPABASE_SERVICE_ROLE_KEY w .env.local');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'piotr@balticbenefits.pl';
const PASSWORD = '123456';
const FULL_NAME = 'Piotr Felcman';
const ROLE = 'partner';

// ── 1) auth user (utworzenie lub aktualizacja hasła + email_confirm) ─────────
let userId = null;
{
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) { console.error('listUsers:', listErr.message); process.exit(1); }
  const existing = listData?.users?.find(u => (u.email ?? '').toLowerCase() === EMAIL.toLowerCase());
  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) { console.error('updateUserById:', error.message); process.exit(1); }
    console.log(`[auth] istniejący użytkownik zaktualizowany: ${userId}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data?.user) { console.error('createUser:', error?.message); process.exit(1); }
    userId = data.user.id;
    console.log(`[auth] nowy użytkownik utworzony: ${userId}`);
  }
}

// ── 2) user_profile (upsert) ─────────────────────────────────────────────────
{
  // Dobierzmy menedzera, żeby partner pojawił się w hierarchii.
  // Bierzemy pierwszego usera z rolą menedzer (jest tylko jeden — menedzer@bbs.test).
  const { data: mgr } = await admin
    .from('user_profiles')
    .select('id, full_name')
    .eq('role', 'menedzer')
    .limit(1)
    .maybeSingle();

  const managerId = mgr?.id ?? null;

  const { error } = await admin
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        full_name: FULL_NAME,
        role: ROLE,
        status: 'active',
        manager_id: managerId,
        temp_password: PASSWORD,
      },
      { onConflict: 'id' }
    );
  if (error) { console.error('user_profiles upsert:', error.message); process.exit(1); }
  console.log(`[profile] OK | role=${ROLE} | manager_id=${managerId ?? '(none)'} ${mgr ? `(${mgr.full_name})` : ''}`);
}

console.log('\n✓ Konto Piotr Felcman gotowe.');
console.log('  Email:   ', EMAIL);
console.log('  Hasło:   ', PASSWORD);
console.log('  Rola:    ', ROLE);
console.log('  user_id: ', userId);
