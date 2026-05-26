import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id: leadId } = await params;

  const { data, error } = await admin()
    .from('lead_notes')
    .select('id, content, author_name, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id: leadId } = await params;

  const body = await request.json();
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) {
    return NextResponse.json({ error: 'Treść notatki jest wymagana' }, { status: 400 });
  }

  // Fetch author name from user_profiles
  const { data: profile } = await admin()
    .from('user_profiles')
    .select('full_name')
    .eq('id', auth.id)
    .single();

  const { data, error } = await admin()
    .from('lead_notes')
    .insert({
      lead_id:     leadId,
      content,
      author_id:   auth.id,
      author_name: profile?.full_name ?? auth.email ?? 'Nieznany',
    })
    .select('id, content, author_name, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
