import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCallerRole(request: NextRequest): Promise<string | null> {
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await adminClient()
    .from('user_profiles').select('role').eq('id', user.id).single();
  return profile?.role ?? null;
}

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function GET(request: NextRequest) {
  const role = await getCallerRole(request);
  if (!role || !CRM_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = adminClient().from('leads').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const role = await getCallerRole(request);
  if (!role || !['superadmin', 'menedzer', 'dyrektor'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, nip, contact_person, phone, email, notes, source } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // Deduplicate by NIP
  if (nip) {
    const { data: existing } = await adminClient()
      .from('leads').select('id').eq('nip', nip).neq('status', 'rejected').limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Lead z tym NIP już istnieje', code: 'DUPLICATE_NIP' }, { status: 409 });
    }
  }

  const { data, error } = await adminClient()
    .from('leads')
    .insert({ name, nip, contact_person, phone, email, notes, source: source ?? 'manual' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
