import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'] as const;

export async function GET(_request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const visibleIds = await getVisibleUserIds(auth.id, auth.role);

  let query = admin()
    .from('crm_invoices')
    .select('*, lead:leads(id, name), issued_by_user:user_profiles!crm_invoices_issued_by_fkey(id, full_name)')
    .order('created_at', { ascending: false });

  if (visibleIds !== null) {
    if (visibleIds.length === 0) return NextResponse.json([]);
    query = query.in('issued_by', visibleIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const {
    lead_id = null,
    offer_id = null,
    invoice_number = null,
    amount_net = 0,
    vat_rate = 23,
    provision_pct = 0,
    due_at = null,
  } = body ?? {};

  const { data, error } = await admin()
    .from('crm_invoices')
    .insert({
      lead_id,
      offer_id,
      issued_by: auth.id,
      invoice_number,
      amount_net,
      vat_rate,
      provision_pct,
      due_at,
      status: 'DRAFT',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
