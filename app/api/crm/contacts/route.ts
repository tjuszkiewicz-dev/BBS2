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
  const search = url.searchParams.get('q');

  const supabase = supabaseServer();
  let query = supabase
    .from('crm_contacts')
    .select('*')
    .order('last_name');

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`
    );
  }

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
  const { first_name, last_name, email, phone, position, company_name, company_id, notes, is_primary } = body;
  if (!first_name || !last_name) {
    return NextResponse.json({ error: 'first_name i last_name są wymagane' }, { status: 400 });
  }

  const { data, error } = await supabaseServer()
    .from('crm_contacts')
    .insert({
      first_name, last_name, email, phone, position,
      company_name, company_id: company_id || null,
      notes, is_primary: is_primary ?? false,
      assigned_to: auth.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
