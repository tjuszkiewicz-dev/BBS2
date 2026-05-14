import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { obliczGlobalnie } from '@/lib/crm/tax-engine/calculator';
import { DEFAULT_CONFIG } from '@/lib/crm/tax-engine/constants';
import type { Firma, Pracownik, CalcConfig } from '@/lib/crm/tax-engine/types';
import type { Database } from '@/types/database';

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function POST(request: NextRequest) {
  // Auth check
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await adminClient()
    .from('user_profiles').select('role').eq('id', user.id).single();
  if (!profile || !CRM_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { firma, pracownicy, provisionPct, save } = body as {
    firma: Firma;
    pracownicy: Pracownik[];
    provisionPct?: number;
    save?: boolean;
  };

  if (!firma || !pracownicy || pracownicy.length === 0) {
    return NextResponse.json({ error: 'firma and pracownicy required' }, { status: 400 });
  }

  // Load active config from DB or use default
  let config: CalcConfig = DEFAULT_CONFIG;
  const { data: configRow } = await adminClient()
    .from('calculator_configs')
    .select('config')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (configRow?.config) config = configRow.config as CalcConfig;

  const provision = provisionPct ?? config.prowizja.standard;
  const wyniki = obliczGlobalnie(pracownicy, firma, provision, config);

  // Optionally save to DB
  if (save) {
    await adminClient().from('payroll_calculations').insert({
      created_by: user.id,
      company_name: firma.nazwa,
      nip: firma.nip,
      period: firma.okres,
      employees: pracownicy as unknown as never,
      results: wyniki as unknown as never,
      config: config as unknown as never,
      provision_percent: provision,
      status: 'draft',
    });
  }

  return NextResponse.json({ wyniki, config });
}
