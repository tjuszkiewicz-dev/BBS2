-- Migration 036: Funkcja agregująca wygasłe vouchery per pracownik
-- =============================================================================
-- Problem: endpoint /expired-vouchers pobierał indywidualne wiersze voucherów
-- bez limitu — PostgREST zwraca domyślnie max 1000 wierszy. Przy 3900+
-- wygasłych voucherach JavaScript widział tylko pierwszy 1000 i grupował
-- tylko tych właścicieli, którzy trafili do pierwszych 1000 rekordów.
--
-- Rozwiązanie: przenieść COUNT+GROUP BY do SQL — funkcja zwraca 1 wiersz
-- per pracownik niezależnie od liczby voucherów.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_expired_vouchers_by_employee(p_company_id UUID)
RETURNS TABLE(employee_id UUID, voucher_count BIGINT)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    current_owner_id  AS employee_id,
    COUNT(*)          AS voucher_count
  FROM vouchers
  WHERE company_id       = p_company_id
    AND status           IN ('expired', 'buyback_pending')
    AND current_owner_id IS NOT NULL
  GROUP BY current_owner_id;
$$;

COMMENT ON FUNCTION get_expired_vouchers_by_employee IS
  'Zwraca liczbę wygasłych/buyback_pending voucherów per właściciel dla danej firmy. '
  'Agregacja w SQL — nie podlega limitowi wierszy PostgREST (1000 domyślnie).';
