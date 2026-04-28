// backfill-pesel.mjs — jednorazowy skrypt backfill szyfrowania PESEL
// Wywołuje backfill_pesel_encrypted(key) w Supabase używając klucza z EBS_PESEL_KEY
// Uruchom: node backfill-pesel.mjs

import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)?.[1]?.trim();
const svc = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)?.[1]?.trim();
const peselKey = env.match(/EBS_PESEL_KEY=([^\r\n]+)/)?.[1]?.trim();

if (!supabaseUrl || !svc) {
  console.error('Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local');
  process.exit(1);
}
if (!peselKey) {
  console.error('Brak EBS_PESEL_KEY w .env.local — dodaj klucz przed uruchomieniem backfill.');
  process.exit(1);
}
if (peselKey.length < 16) {
  console.error(`EBS_PESEL_KEY za krótki (${peselKey.length} znaków, min. 16). Wygeneruj nowy klucz.`);
  process.exit(1);
}

console.log(`Supabase: ${supabaseUrl}`);
console.log(`Klucz: ${peselKey.slice(0, 4)}${'*'.repeat(peselKey.length - 8)}${peselKey.slice(-4)}`);
console.log('Uruchamiam backfill_pesel_encrypted()...\n');

const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/backfill_pesel_encrypted`, {
  method: 'POST',
  headers: {
    'apikey': svc,
    'Authorization': `Bearer ${svc}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ p_key: peselKey }),
});

if (!resp.ok) {
  const text = await resp.text();
  console.error(`Błąd HTTP ${resp.status}: ${text}`);
  process.exit(1);
}

const count = await resp.json();
console.log(`Zaszyfrowano ${count} rekordów PESEL.`);
console.log('\nNastępne kroki:');
console.log('1. Zweryfikuj że pesel_encrypted jest wypełniony (sprawdź w Supabase Studio)');
console.log('2. Zaktualizuj Vercel env: EBS_PESEL_KEY=' + peselKey);
console.log('3. Po weryfikacji kodu app — usuń kolumnę pesel (osobna migracja)');
