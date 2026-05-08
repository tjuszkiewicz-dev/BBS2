// POST /api/admin/company-cleanup
// Czyści dane transakcyjne dla konkretnej firmy (po company_id).
// Używa SQL funkcji company_cleanup() (migracja 033) która:
//   - ZACHOWUJE user_profiles pracowników (profile NIE są usuwane)
//   - Zeruje voucher_accounts
//   - Usuwa transakcyjne dane (vouchery, zamówienia, dokumenty, itd.)
// Dlatego NIE usuwamy auth.users — pracownicy mogą się ponownie zalogować.
// Dostępny tylko dla superadmin lub pracodawca.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !['superadmin', 'pracodawca'].includes(auth.role)) {
    return NextResponse.json({ error: 'Wymagana rola superadmin lub pracodawca' }, { status: 403 });
  }

  const { companyId } = await req.json();
  if (!companyId) {
    return NextResponse.json({ error: 'Brak companyId' }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Wywołaj SQL funkcję company_cleanup() — obsługuje FK constraints i bypass
  // triggera immutable ledger przez set_config('app.bypass_ledger_immutability', 'true', true).
  // Migracja 033 ZACHOWUJE user_profiles pracowników — NIE usuwamy auth.users.
  const { data: rpcData, error: rpcError } = await (supabase as any)
    .rpc('company_cleanup', { p_company_id: companyId });

  if (rpcError) {
    // Fallback: funkcja może jeszcze nie być zainstalowana — wywołaj ręczne czyszczenie
    // dla tabel które nie mają FK blockerów.
    const fallbackResults: Record<string, number | string> = {};
    try {
      const del = async (table: string, field: string, value: string) => {
        const { error, count } = await (supabase as any)
          .from(table)
          .delete({ count: 'exact' })
          .eq(field, value);
        if (error) throw new Error(`${table}: ${error.message}`);
        fallbackResults[table] = count ?? 0;
      };

      await del('buyback_batches', 'company_id', companyId);
      await del('financial_documents', 'company_id', companyId);

      // Zeruj saldo voucherów (nie usuwaj kont — migracja 033 zachowuje profile)
      const { data: employees } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('role', 'pracownik');
      const empIds = (employees ?? []).map((e: any) => e.id as string);

      if (empIds.length > 0) {
        await (supabase as any)
          .from('voucher_accounts')
          .update({ balance: 0 })
          .in('user_id', empIds);
      }

      // vouchers/voucher_transactions wymagają funkcji SQL — pomiń z informacją
      fallbackResults['vouchers'] = 'pominięto — zainstaluj migrację 033_fix_company_cleanup_keep_employees.sql';
      fallbackResults['rpc_error'] = rpcError.message;

      return NextResponse.json({ ok: false, companyId, deleted: fallbackResults, rpcError: rpcError.message }, { status: 500 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message, rpcError: rpcError.message }, { status: 500 });
    }
  }

  // RPC zwraca { ok: true, deleted: { ... } }
  // Nie usuwamy auth.users — migracja 033 zachowuje profile pracowników.
  const result = rpcData as { ok: boolean; deleted: Record<string, number> } | null;
  return NextResponse.json({
    ok: true,
    companyId,
    deleted: result?.deleted ?? {},
  });
}

