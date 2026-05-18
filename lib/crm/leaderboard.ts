import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

export const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'] as const;

export type Period = 'month' | 'quarter' | 'year';

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

export function getPeriodStart(period: Period): string {
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

/**
 * Fetch the leaderboard for a given caller and period.
 * Throws on DB errors; returns an empty array when no visible users exist.
 */
export async function fetchLeaderboard(
  callerId: string,
  callerRole: string,
  period: Period,
): Promise<LeaderboardEntry[]> {
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
    throw new Error(profilesError.message);
  }
  if (!profiles || profiles.length === 0) {
    return [];
  }

  const userIds = profiles.map((p: { id: string }) => p.id);

  // Filter by created_at per spec. Limitation: leads created before the period
  // but signed within it are excluded. Add a signed_at column to leads and filter
  // on that instead if precise "closed this period" tracking is needed.
  const { data: leads, error: leadsError } = await admin()
    .from('leads')
    .select('id, assigned_to, status')
    .in('assigned_to', userIds)
    .gte('created_at', periodStart);

  if (leadsError) {
    throw new Error(leadsError.message);
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
