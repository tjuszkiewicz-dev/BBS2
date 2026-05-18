import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

type Period = 'month' | 'quarter' | 'year';

function getPeriodStart(period: Period): string {
  const now = new Date();
  let start: Date;

  if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), quarterMonth, 1);
  } else {
    // year
    start = new Date(now.getFullYear(), 0, 1);
  }

  return start.toISOString();
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  leads_count: number;
  deals_closed: number;
  conversion_rate: number;
  rank: number;
  badge: 'gold' | 'silver' | 'bronze' | null;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get('period') ?? 'month';
  const period: Period = (['month', 'quarter', 'year'] as const).includes(periodParam as Period)
    ? (periodParam as Period)
    : 'month';

  const periodStart = getPeriodStart(period);

  // Step 1: Get visible user IDs for the caller
  const visibleIds = await getVisibleUserIds(auth.id, auth.role);

  // Step 2: Fetch user_profiles for CRM sales roles (partner, menedzer, dyrektor)
  // Note: avatar_url is not in the DB schema — always returned as null
  let profilesQuery = admin()
    .from('user_profiles')
    .select('id, full_name')
    .in('role', ['partner', 'menedzer', 'dyrektor']);

  if (visibleIds !== null) {
    if (visibleIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }
    profilesQuery = profilesQuery.in('id', visibleIds);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }
  if (!profiles || profiles.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const userIds = profiles.map(p => p.id);

  // Step 3: Fetch all leads in the period assigned to those users
  const { data: leads, error: leadsError } = await admin()
    .from('leads')
    .select('id, assigned_to, status')
    .in('assigned_to', userIds)
    .gte('created_at', periodStart);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  const leadsData = leads ?? [];

  // Step 4: Aggregate per user
  const leadsByUser = new Map<string, { total: number; signed: number }>();
  for (const userId of userIds) {
    leadsByUser.set(userId, { total: 0, signed: 0 });
  }
  for (const lead of leadsData) {
    if (!lead.assigned_to) continue;
    const entry = leadsByUser.get(lead.assigned_to);
    if (!entry) continue;
    entry.total += 1;
    if (lead.status === 'SIGNED') {
      entry.signed += 1;
    }
  }

  // Step 5: Build entries, sort, assign rank + badge
  const entries: Omit<LeaderboardEntry, 'rank' | 'badge'>[] = profiles.map(profile => {
    const stats = leadsByUser.get(profile.id) ?? { total: 0, signed: 0 };
    const conversion_rate =
      stats.total > 0 ? Math.round((stats.signed / stats.total) * 100 * 100) / 100 : 0;
    return {
      user_id: profile.id,
      full_name: profile.full_name ?? '',
      avatar_url: null,
      leads_count: stats.total,
      deals_closed: stats.signed,
      conversion_rate,
    };
  });

  entries.sort((a, b) => {
    if (b.deals_closed !== a.deals_closed) return b.deals_closed - a.deals_closed;
    return b.leads_count - a.leads_count;
  });

  const BADGES: Array<'gold' | 'silver' | 'bronze'> = ['gold', 'silver', 'bronze'];

  const leaderboard: LeaderboardEntry[] = entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
    badge: idx < 3 ? BADGES[idx] : null,
  }));

  return NextResponse.json(leaderboard);
}
