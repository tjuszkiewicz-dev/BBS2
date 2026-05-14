import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function GET(req: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const leadId = url.searchParams.get('lead_id');
  if (!leadId) {
    return NextResponse.json({ error: 'lead_id wymagany' }, { status: 400 });
  }

  // Sprawdź czy lead jest widoczny dla tego użytkownika
  const visibleIds = await getVisibleUserIds(auth.id, auth.role);
  if (visibleIds !== null) {
    const { data: lead } = await admin()
      .from('leads')
      .select('assigned_to')
      .eq('id', leadId)
      .single();
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (lead.assigned_to && !visibleIds.includes(lead.assigned_to)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data, error } = await admin()
    .from('crm_client_activities')
    .select('*, user:user_id(id, email)')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { lead_id, type, description, occurred_at } = body;

  if (!lead_id || !type) {
    return NextResponse.json({ error: 'lead_id i type są wymagane' }, { status: 400 });
  }
  if (!['CALL', 'MEETING', 'EMAIL', 'NOTE'].includes(type)) {
    return NextResponse.json({ error: 'Nieprawidłowy typ aktywności' }, { status: 400 });
  }

  const { data, error } = await admin()
    .from('crm_client_activities')
    .insert({
      lead_id,
      user_id: auth.id,
      type,
      description: description || null,
      occurred_at: occurred_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Zaktualizuj last_activity_at na leadzie
  await admin()
    .from('leads')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', lead_id);

  return NextResponse.json(data, { status: 201 });
}
