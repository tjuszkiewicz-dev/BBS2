import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, applyVisibilityFilter, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function GET(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const visibleIds = await getVisibleUserIds(auth.id, auth.role);

  // menedzer i dyrektor widzą też leady nieprzypisane (do podziału w zespole)
  const includeUnassigned = ['menedzer', 'dyrektor', 'superadmin'].includes(auth.role);

  let query = admin()
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  query = applyVisibilityFilter(query, visibleIds, includeUnassigned);
  if (status) query = (query as any).eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, nip, contact_person, phone, email, notes, source, assigned_to } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // Partner zawsze dostaje lead przypisany do siebie
  // Menedzer/dyrektor mogą przypisać do wybranego użytkownika (lub siebie)
  let finalAssignedTo: string = auth.id;
  if (auth.role !== 'partner' && assigned_to) {
    // Sprawdź czy assigned_to należy do widocznej grupy
    const visibleIds = await getVisibleUserIds(auth.id, auth.role);
    if (visibleIds === null || visibleIds.includes(assigned_to)) {
      finalAssignedTo = assigned_to;
    }
  }

  // Deduplicate by NIP
  if (nip) {
    const { data: existing } = await admin()
      .from('leads')
      .select('id')
      .eq('nip', nip)
      .neq('status', 'LOST')
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Lead z tym NIP już istnieje', code: 'DUPLICATE_NIP' }, { status: 409 });
    }
  }

  const { data, error } = await admin()
    .from('leads')
    .insert({
      name,
      nip,
      contact_person,
      phone,
      email,
      notes,
      source: source ?? 'manual',
      assigned_to: finalAssignedTo,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
