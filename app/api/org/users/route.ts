import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

const ORG_ROLES = ['superadmin', 'dyrektor', 'menedzer'];
const CREATABLE_ROLES = ['dyrektor', 'menedzer', 'partner', 'hr', 'pracodawca'];

export async function GET(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !ORG_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const visibleIds = await getVisibleUserIds(auth.id, auth.role);

  let query = admin()
    .from('user_profiles')
    .select('id, full_name, role, manager_id')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (visibleIds !== null) {
    if (visibleIds.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in('id', visibleIds);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !ORG_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { full_name, email, role, manager_id } = body ?? {};

  if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
    return NextResponse.json({ error: 'Imię i nazwisko wymagane' }, { status: 400 });
  }
  if (!email || typeof email !== 'string' || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return NextResponse.json({ error: 'Poprawny email wymagany' }, { status: 400 });
  }
  if (!role || !CREATABLE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Rola musi być jedną z: ${CREATABLE_ROLES.join(', ')}` },
      { status: 400 }
    );
  }

  // Only superadmin can create dyrektor; dyrektor can only create menedzer/partner under self
  if (auth.role === 'dyrektor' && (role === 'dyrektor' || role === 'superadmin')) {
    return NextResponse.json({ error: 'Dyrektor nie może tworzyć dyrektorów' }, { status: 403 });
  }
  if (auth.role === 'menedzer' && role !== 'partner') {
    return NextResponse.json({ error: 'Menedzer może dodawać tylko partnerów' }, { status: 403 });
  }

  const supabase = admin();
  const normalizedEmail = email.toLowerCase().trim();

  // Generate temporary password
  const tempPassword =
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6) +
    Math.floor(10 + Math.random() * 90) +
    '!';

  // Check if auth user already exists
  let userId: string;
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = (listData?.users ?? []).find(
    (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
  );

  if (existing) {
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, {
      password: tempPassword,
      email_confirm: true,
    });
  } else {
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
    });
    if (authError || !newUser?.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Nie udało się utworzyć konta auth' },
        { status: 500 }
      );
    }
    userId = newUser.user.id;
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: userId,
        full_name: full_name.trim(),
        role,
        manager_id: manager_id ?? null,
        temp_password: tempPassword,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: userId,
      full_name: full_name.trim(),
      role,
      manager_id: manager_id ?? null,
      email: normalizedEmail,
      tempPassword,
    },
    { status: 201 }
  );
}
