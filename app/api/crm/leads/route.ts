import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function GET(req: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url    = new URL(req.url);
  const status = url.searchParams.get('status');

  const supabase = supabaseServer();
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, nip, contact_person, phone, email, notes, status = 'NEW', source } = body;
  if (!name) return NextResponse.json({ error: 'name jest wymagane' }, { status: 400 });

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('leads')
    .insert({ name, nip, contact_person, phone, email, notes, status, source, assigned_to: auth.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
