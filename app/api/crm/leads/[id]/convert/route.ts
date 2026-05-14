import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: lead, error: leadErr } = await adminClient()
    .from('leads').select('*').eq('id', id).single();

  if (leadErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Mark lead as converted
  await adminClient()
    .from('leads')
    .update({ status: 'converted', converted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  // Create CRM client profile if company exists or create stub
  const { data: profile } = await adminClient()
    .from('crm_client_profiles')
    .insert({
      company_id: lead.company_id ?? null,
      status: 'IN_TALKS',
      notes: lead.notes,
    })
    .select()
    .single();

  return NextResponse.json({ ok: true, lead_id: id, profile_id: profile?.id });
}
