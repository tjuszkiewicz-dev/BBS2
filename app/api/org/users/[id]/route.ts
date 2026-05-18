import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getVisibleUserIds } from '@/lib/crm/visibility';

const ORG_ROLES = ['superadmin', 'dyrektor', 'menedzer'];

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getAuthUserWithRole();

  if (!auth || !ORG_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { full_name, role, manager_id } = body;

  // Fetch target user to check their current state
  const { data: targetUser, error: fetchError } = await adminClient()
    .from('user_profiles')
    .select('id, full_name, role, manager_id')
    .eq('id', id)
    .single();

  if (fetchError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Permission checks based on role
  if (auth.role === 'superadmin') {
    // superadmin can change everything for anyone
  } else if (auth.role === 'dyrektor') {
    // dyrektor can change full_name and manager_id, but NOT role
    // AND only for users visible to them
    if (role !== undefined) {
      return NextResponse.json(
        { error: 'Dyrektor cannot change user role' },
        { status: 403 }
      );
    }

    const visibleIds = await getVisibleUserIds(auth.id, auth.role);
    if (visibleIds === null || !visibleIds.includes(id)) {
      return NextResponse.json(
        { error: 'User not visible to you' },
        { status: 403 }
      );
    }
  } else if (auth.role === 'menedzer') {
    // menedzer can only change manager_id of their direct reports
    // CANNOT change full_name or role
    if (full_name !== undefined || role !== undefined) {
      return NextResponse.json(
        { error: 'Menedzer can only change manager_id' },
        { status: 403 }
      );
    }

    const visibleIds = await getVisibleUserIds(auth.id, auth.role);
    if (visibleIds === null || !visibleIds.includes(id)) {
      return NextResponse.json(
        { error: 'User not visible to you' },
        { status: 403 }
      );
    }
  }

  // Build update object with only provided fields
  const updates: { full_name?: string; role?: string; manager_id?: string | null } = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (role !== undefined) updates.role = role;
  if (manager_id !== undefined) updates.manager_id = manager_id;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await adminClient()
    .from('user_profiles')
    .update(updates)
    .eq('id', id)
    .select('id, full_name, role, manager_id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
