import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase';

// GET /api/users — pobierz użytkowników (superadmin: wszyscy lub per firma, HR: tylko swojej firmy)
export async function GET(req: NextRequest) {
    const auth = await getAuthUserWithRole();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['superadmin', 'pracodawca'].includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = supabaseServer();
    const requestedCompanyId = req.nextUrl.searchParams.get('companyId');

    let effectiveCompanyId: string | null = requestedCompanyId;
    if (auth.role === 'pracodawca') {
        const hrCompanyId = auth.companyId ?? null;
        if (requestedCompanyId && hrCompanyId && requestedCompanyId !== hrCompanyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Preferred: pin to HR company from profile.
        // Legacy fallback: when HR profile misses company_id, allow explicit companyId from query.
        // This prevents empty employee directory after session refresh in older datasets.
        effectiveCompanyId = hrCompanyId ?? requestedCompanyId ?? null;
    }

    let profilesQuery = supabase
        .from('user_profiles')
        .select('*, company:companies(id, name)')
        .order('created_at', { ascending: false });

    if (effectiveCompanyId) {
        profilesQuery = profilesQuery.eq('company_id', effectiveCompanyId);
    }

    const [profilesResult, authUsersResult] = await Promise.all([
        profilesQuery,
        supabase.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (profilesResult.error) {
        return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
    }

    const profileIds = (profilesResult.data ?? []).map(p => p.id);
    const { data: balancesData } = profileIds.length > 0
        ? await supabase
            .from('voucher_accounts')
            .select('user_id, balance')
            .in('user_id', profileIds)
        : { data: [] as Array<{ user_id: string; balance: number }> };

    const emailMap = new Map(
        (authUsersResult.data?.users ?? []).map(u => [u.id, u.email ?? ''])
    );

    const balanceMap = new Map(
        (balancesData ?? []).map((b: any) => [b.user_id, Number(b.balance ?? 0)])
    );

    const withEmails = (profilesResult.data ?? []).map(p => ({
        ...p,
        email: emailMap.get(p.id) ?? '',
        voucherBalance: balanceMap.get(p.id) ?? 0,
        company_name: (p.company as any)?.name ?? null,
    }));

    return NextResponse.json(withEmails);
}
