import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Zwraca zestaw user_id których leady/kontakty są widoczne dla danego użytkownika.
 *
 * - superadmin → null (brak filtra = wszystko)
 * - dyrektor   → siebie + menedzerzy z manager_id = self + partnerzy pod tymi menedzerami
 * - menedzer   → siebie + partnerzy z manager_id = self
 * - partner    → tylko siebie
 */
export async function getVisibleUserIds(
  callerId: string,
  callerRole: string,
): Promise<string[] | null> {
  if (callerRole === 'superadmin') return null;

  if (callerRole === 'partner') {
    return [callerId];
  }

  if (callerRole === 'menedzer') {
    const { data } = await admin()
      .from('user_profiles')
      .select('id')
      .eq('manager_id', callerId);
    const directReportIds = data?.map(u => u.id) ?? [];
    return [callerId, ...directReportIds];
  }

  if (callerRole === 'dyrektor') {
    // Level 1: menedzerzy bezpośrednio pod dyrektorem
    const { data: l1 } = await admin()
      .from('user_profiles')
      .select('id')
      .eq('manager_id', callerId);
    const menedzerIds = l1?.map(u => u.id) ?? [];

    // Level 2: partnerzy pod tymi menedzerami
    let partnerIds: string[] = [];
    if (menedzerIds.length > 0) {
      const { data: l2 } = await admin()
        .from('user_profiles')
        .select('id')
        .in('manager_id', menedzerIds);
      partnerIds = l2?.map(u => u.id) ?? [];
    }

    return [callerId, ...menedzerIds, ...partnerIds];
  }

  return [callerId];
}

/**
 * Dodaje filtr .in('assigned_to', ids) do zapytania Supabase.
 * Jeśli ids = null → brak filtra (superadmin widzi wszystko).
 * Jeśli ids jest puste → nic nie jest widoczne (zabezpieczenie).
 */
export function applyVisibilityFilter<T>(
  query: T,
  visibleIds: string[] | null,
  includeUnassigned = false,
): T {
  if (visibleIds === null) return query;

  if (visibleIds.length === 0) {
    // Brak podwładnych — widzi tylko własne (ale nie powinno się tu trafić)
    return (query as any).eq('assigned_to', 'no-match-uuid') as T;
  }

  if (includeUnassigned) {
    // menedzer/dyrektor widzi też nieprzypisane leady
    const filter = visibleIds.map(id => `assigned_to.eq.${id}`).join(',');
    return (query as any).or(`assigned_to.is.null,${filter}`) as T;
  }

  return (query as any).in('assigned_to', visibleIds) as T;
}

export { admin };
