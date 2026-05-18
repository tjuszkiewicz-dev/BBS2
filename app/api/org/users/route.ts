import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, applyVisibilityFilter, admin } from '@/lib/crm/visibility';

const ORG_ROLES = ['superadmin', 'dyrektor', 'menedzer'];

export async function GET(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !ORG_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const visibleIds = await getVisibleUserIds(auth.id, auth.role);

  // For org users, do NOT include unassigned (includeUnassigned = false)
  // Only return users explicitly in the hierarchy
  let query = admin()
    .from('user_profiles')
    .select('id, full_name, role, manager_id')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  query = applyVisibilityFilter(query, visibleIds, false);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
