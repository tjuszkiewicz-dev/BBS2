import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await supabaseServer().from('leads').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body  = await req.json();
  const { name, nip, contact_person, phone, email, notes, status, source, qualification_notes } = body;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name               !== undefined) update.name = name;
  if (nip                !== undefined) update.nip  = nip;
  if (contact_person     !== undefined) update.contact_person = contact_person;
  if (phone              !== undefined) update.phone = phone;
  if (email              !== undefined) update.email = email;
  if (notes              !== undefined) update.notes = notes;
  if (status             !== undefined) update.status = status;
  if (source             !== undefined) update.source = source;
  if (qualification_notes !== undefined) update.qualification_notes = qualification_notes;

  const { data, error } = await supabaseServer()
    .from('leads')
    .update(update)
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
  const { error } = await supabaseServer().from('leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
