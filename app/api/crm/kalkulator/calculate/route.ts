import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { obliczGlobalnie } from '@/lib/crm/tax-engine/calculator';
import { DEFAULT_CONFIG, Pracownik } from '@/lib/crm/tax-engine/types';
import { supabaseServer } from '@/lib/supabase';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function POST(req: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    pracownicy,
    stawkaWypadkowa   = 1.67,
    prowizjaProc      = 28,
    nettoZasadProc    = 50,
    saveSession       = false,
    sessionName,
    leadId,
    companyName,
    nip,
    period,
  }: {
    pracownicy:      Pracownik[];
    stawkaWypadkowa: number;
    prowizjaProc:    number;
    nettoZasadProc:  number;
    saveSession:     boolean;
    sessionName:     string;
    leadId:          string;
    companyName:     string;
    nip:             string;
    period:          string;
  } = body;

  if (!Array.isArray(pracownicy) || pracownicy.length === 0) {
    return NextResponse.json({ error: 'pracownicy są wymagani' }, { status: 400 });
  }

  // Load config from DB if active config exists
  let cfg = DEFAULT_CONFIG;
  try {
    const { data: cfgRow } = await supabaseServer()
      .from('calculator_configs')
      .select('config')
      .eq('is_active', true)
      .single();
    if (cfgRow?.config) cfg = { ...DEFAULT_CONFIG, ...(cfgRow.config as object) } as typeof DEFAULT_CONFIG;
  } catch {
    // use default config
  }

  const wyniki = obliczGlobalnie(pracownicy, stawkaWypadkowa, prowizjaProc, nettoZasadProc, cfg);

  if (saveSession) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseServer().from('payroll_calculations') as any).insert({
      created_by:        auth.id,
      company_name:      companyName ?? '',
      nip:               nip ?? null,
      lead_id:           leadId || null,
      period:            period || new Date().toISOString().slice(0, 7),
      employees:         pracownicy,
      results:           wyniki,
      config:            cfg,
      provision_percent: prowizjaProc,
      status:            'draft',
    });
  }

  return NextResponse.json({ wyniki, config: cfg });
}
