import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import {
  CRM_ROLES,
  fetchLeaderboard,
  type LeaderboardEntry,
  type Period,
} from '@/lib/crm/leaderboard';

const BONUS = { gold: 5000, silver: 3000, bronze: 1000 } as const;

/**
 * Escape a CSV cell value per RFC 4180 and prevent formula injection.
 * - Strips formula-injection prefix (=, +, -, @, tab, CR) by prepending a single quote
 * - Wraps in double-quotes if the value contains a comma, double-quote, or newline
 * - Escapes embedded double-quotes by doubling them
 */
function csvCell(v: string | number): string {
  const s = String(v);
  // Strip formula injection prefix (=, +, -, @, tab, CR)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  // RFC 4180: quote if contains comma, double-quote, or newline
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function buildCsv(entries: LeaderboardEntry[]): string {
  // UTF-8 BOM — required for Excel on Windows to correctly decode Polish characters (ą, ę, ó, ż …)
  const BOM = '﻿';

  const header = 'Miejsce,Handlowiec,Leady,Umowy,Konwersja%,Premia_bazowa';

  const rows = entries.map(entry => {
    const bonus = entry.badge ? BONUS[entry.badge] : '';
    const konwersja = entry.conversion_rate.toFixed(2);
    return [
      csvCell(entry.rank),
      csvCell(entry.full_name),
      csvCell(entry.leads_count),
      csvCell(entry.deals_closed),
      csvCell(konwersja),
      csvCell(bonus),
    ].join(',');
  });

  return BOM + [header, ...rows].join('\r\n');
}

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
    const leaderboard = await fetchLeaderboard(auth.id, auth.role, period);
    const csv = buildCsv(leaderboard);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leaderboard-${period}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
