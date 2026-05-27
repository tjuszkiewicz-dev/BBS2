import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'] as const;

type Ctx = { params: Promise<{ id: string }> };

async function loadInvoiceWithCheck(id: string, callerId: string, callerRole: string) {
  const { data, error } = await admin()
    .from('crm_invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return { invoice: null, status: 404 as const };

  const visibleIds = await getVisibleUserIds(callerId, callerRole);
  if (visibleIds !== null && (!data.issued_by || !visibleIds.includes(data.issued_by))) {
    return { invoice: null, status: 403 as const };
  }
  return { invoice: data, status: 200 as const };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const res = await loadInvoiceWithCheck(id, auth.id, auth.role);
  if (res.status !== 200) {
    return NextResponse.json(
      { error: res.status === 404 ? 'Not found' : 'Forbidden' },
      { status: res.status }
    );
  }
  return NextResponse.json(res.invoice);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const check = await loadInvoiceWithCheck(id, auth.id, auth.role);
  if (check.status !== 200) {
    return NextResponse.json({ error: 'Forbidden' }, { status: check.status });
  }

  const body = await req.json();
  const allowed: Record<string, true> = {
    invoice_number: true, amount_net: true, vat_rate: true, provision_pct: true,
    status: true, issued_at: true, due_at: true, paid_at: true,
  };
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of Object.keys(body ?? {})) {
    if (allowed[k]) updates[k] = body[k];
  }

  const { data, error } = await admin()
    .from('crm_invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const check = await loadInvoiceWithCheck(id, auth.id, auth.role);
  if (check.status !== 200) {
    return NextResponse.json({ error: 'Forbidden' }, { status: check.status });
  }

  // Tylko superadmin kasuje fizycznie; reszta → status CANCELLED.
  if (auth.role !== 'superadmin') {
    const { data, error } = await admin()
      .from('crm_invoices')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { error } = await admin().from('crm_invoices').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
