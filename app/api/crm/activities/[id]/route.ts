import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { type, description, occurred_at, is_completed } = body;

  const update: Record<string, unknown> = {};
  if (type) update.type = type;
  if (description !== undefined) update.description = description;
  if (occurred_at) update.occurred_at = occurred_at;
  if (is_completed !== undefined) update.is_completed = is_completed;

  const { data, error } = await admin()
    .from('crm_client_activities')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const { error } = await admin().from('crm_client_activities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
