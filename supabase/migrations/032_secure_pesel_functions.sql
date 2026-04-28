-- =============================================================================
-- Migracja 032: Zabezpieczenie funkcji encrypt_pesel / decrypt_pesel
-- =============================================================================
-- M5 (follow-up): Funkcje encrypt_pesel i decrypt_pesel z migracji 031 nie
-- miały REVOKE — każdy authenticated mógł wywołać decrypt_pesel z dowolnym kluczem.
-- Ograniczamy do service_role (Next.js server-side via supabaseServer()).
-- =============================================================================

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::TEXT
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('encrypt_pesel', 'decrypt_pesel', 'backfill_pesel_encrypted')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
