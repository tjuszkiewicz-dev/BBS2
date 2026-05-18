import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';
import type { LeaderboardEntry } from '../route';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

const BONUS = { gold: 5000, silver: 3000, bronze: 1000 } as const;

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

async function fetchLeaderboard(
  callerId: string,
  callerRole: string,
  period: Period,
): Promise<LeaderboardEntry[] | NextResponse> {
  const periodStart = getPeriodStart(period);

  const visibleIds = await getVisibleUserIds(callerId, callerRole);

  let profilesQuery = admin()
    .from('user_profiles')
    .select('id, full_name')
    .in('role', ['partner', 'menedzer', 'dyrektor']);

  if (visibleIds !== null) {
    if (visibleIds.length === 0) {
      return [];
    }
    profilesQuery = profilesQuery.in('id', visibleIds);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }
  if (!profiles || profiles.length === 0) {
    return [];
  }

  const userIds = profiles.map((p: { id: string }) => p.id);

  const { data: leads, error: leadsError } = await admin()
    .from('leads')
    .select('id, assigned_to, status')
    .in('assigned_to', userIds)
    .gte('created_at', periodStart);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  const leadsData = leads ?? [];

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

  const entries: Omit<LeaderboardEntry, 'rank' | 'badge'>[] = profiles.map(
    (profile: { id: string; full_name: string | null }) => {
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
    },
  );

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

  return leaderboard;
}

function buildCsv(entries: LeaderboardEntry[]): string {
  const header = 'Miejsce,Handlowiec,Leady,Umowy,Konwersja%,Premia_bazowa';

  const rows = entries.map(entry => {
    const bonus = entry.badge ? BONUS[entry.badge] : '';
    const konwersja = entry.conversion_rate.toFixed(2);
    return [entry.rank, entry.full_name, entry.leads_count, entry.deals_closed, konwersja, bonus].join(',');
  });

  return [header, ...rows].join('\r\n');
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

  const result = await fetchLeaderboard(auth.id, auth.role, period);

  // If fetchLeaderboard returned an error response, propagate it
  if (result instanceof NextResponse) {
    return result;
  }

  const csv = buildCsv(result);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leaderboard-${period}.csv"`,
    },
  });
}
