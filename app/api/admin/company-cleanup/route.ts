// POST /api/admin/company-cleanup
// Czyści dane transakcyjne dla konkretnej firmy (po company_id).
// Używa SQL funkcji company_cleanup() (migracja 023) która obsługuje
// FK constraints i trigger immutable ledger przez set_config bypass.
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

  // Pobierz ID pracowników żeby usunąć ich konta auth po RPC
  const { data: employeesToDelete } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'pracownik');

  const empIds = (employeesToDelete ?? []).map((e: any) => e.id as string);

  // Wywołaj SQL funkcję company_cleanup() — obsługuje FK constraints i bypass
  // triggera immutable ledger przez set_config('app.bypass_ledger_immutability', 'true', true).
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

      if (empIds.length > 0) {
        await (supabase as any)
          .from('voucher_accounts')
          .delete()
          .in('user_id', empIds);
      }

      // vouchers/voucher_transactions wymagają funkcji SQL — pomiń z informacją
      fallbackResults['vouchers'] = 'pominięto — zainstaluj migrację 023_company_cleanup_fn.sql';
      fallbackResults['rpc_error'] = rpcError.message;

      return NextResponse.json({ ok: false, companyId, deleted: fallbackResults, rpcError: rpcError.message }, { status: 500 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message, rpcError: rpcError.message }, { status: 500 });
    }
  }

  // Usuń konta auth pracowników (profile usunęła funkcja SQL)
  for (const empId of empIds) {
    await (supabase as any).auth.admin.deleteUser(empId).catch(() => null);
  }

  // RPC zwraca { ok: true, deleted: { ... } }
  const result = rpcData as { ok: boolean; deleted: Record<string, number> } | null;
  return NextResponse.json({
    ok: true,
    companyId,
    deleted: result?.deleted ?? {},
    deletedEmployees: empIds.length,
  });
}

