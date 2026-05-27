import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import {
  CRM_ROLES,
  fetchLeaderboard,
  fetchPartnerSelfStanding,
  type LeaderboardEntry,
  type PartnerSelfStanding,
  type Period,
} from '@/lib/crm/leaderboard';

export type { LeaderboardEntry, PartnerSelfStanding };

export async function GET(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get('period') ?? 'month';
  const period: Period = (['month', 'quarter', 'year'] as const).includes(periodParam as Period)
    ? (periodParam as Period)
    : 'month';

  try {
    if (auth.role === 'partner') {
      const self = await fetchPartnerSelfStanding(auth.id, period);
      return NextResponse.json({ self, entries: [] as LeaderboardEntry[] });
    }
    const leaderboard = await fetchLeaderboard(auth.id, auth.role, period);
    return NextResponse.json({ self: null, entries: leaderboard });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
