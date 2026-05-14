import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

async function canAccessLead(callerId: string, callerRole: string, leadId: string): Promise<boolean> {
  if (callerRole === 'superadmin') return true;

  const { data: lead } = await admin()
    .from('leads')
    .select('assigned_to')
    .eq('id', leadId)
    .single();

  if (!lead) return false;

  // Nieprzypisany lead: menedzer i dyrektor mogą zawsze
  if (!lead.assigned_to) {
    return ['menedzer', 'dyrektor'].includes(callerRole);
  }

  const visibleIds = await getVisibleUserIds(callerId, callerRole);
  if (visibleIds === null) return true;
  return visibleIds.includes(lead.assigned_to);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;

  if (!(await canAccessLead(auth.id, auth.role, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await admin().from('leads').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;

  // Partner może edytować tylko swoje leady (status, notatki)
  if (!(await canAccessLead(auth.id, auth.role, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // Partner nie może przenosić leada do innego handlowca
  if (auth.role === 'partner') {
    delete body.assigned_to;
  }

  // Zmiana assigned_to: sprawdź czy target jest w widocznej grupie
  if (body.assigned_to && auth.role !== 'superadmin') {
    const visibleIds = await getVisibleUserIds(auth.id, auth.role);
    if (visibleIds !== null && !visibleIds.includes(body.assigned_to)) {
      return NextResponse.json({ error: 'Nie możesz przypisać leada poza swoją grupę' }, { status: 403 });
    }
  }

  const { data, error } = await admin()
    .from('leads')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUserWithRole();
  if (!auth || !['superadmin', 'dyrektor'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;

  if (!(await canAccessLead(auth.id, auth.role, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin().from('leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
