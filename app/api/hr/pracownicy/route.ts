import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const getAdmin = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q          = searchParams.get('q') ?? '';
  const role       = searchParams.get('role') ?? '';
  const company_id = searchParams.get('company_id') ?? '';

  const admin = getAdmin();

  let query = admin
    .from('user_profiles')
    .select('id, full_name, role, status, company_id, company_name, department, position, contract_type, hire_date, phone_number, created_at')
    .order('full_name', { ascending: true });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,company_name.ilike.%${q}%`);
  }
  if (role) {
    query = query.eq('role', role);
  }
  if (company_id) {
    query = query.eq('company_id', company_id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
