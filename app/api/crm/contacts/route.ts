import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, applyVisibilityFilter, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function GET(req: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url    = new URL(req.url);
  const search = url.searchParams.get('q');

  const visibleIds = await getVisibleUserIds(auth.id, auth.role);

  let query = admin()
    .from('crm_contacts')
    .select('*')
    .order('last_name');

  // Kontakty: partner widzi tylko swoje, menedzer/dyrektor — całą grupę
  // Kontakty nieprzypisane widzi każdy z CRM (przypisane do null = ogólne)
  const includeUnassigned = true;
  query = applyVisibilityFilter(query, visibleIds, includeUnassigned);

  if (search) {
    query = (query as any).or(
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

  const { data, error } = await admin()
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
