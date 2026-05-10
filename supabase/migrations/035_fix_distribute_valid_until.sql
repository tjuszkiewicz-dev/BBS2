-- Migration 035: Fix distribute_to_employee — nie nadpisuj valid_until z mint_vouchers
-- =============================================================================
-- Problem (K3):
--   distribute_to_employee gdy p_valid_until IS NULL i firma nie ma voucher_expiry_day
--   ustawiała v_valid_until = NOW() + 1 month, nadpisując datę z mint_vouchers
--   (NOW() + 12 months). Powodowało to wygaśnięcie voucherów po 1 miesiącu
--   zamiast po 12 miesiącach.
--
-- Rozwiązanie:
--   Gdy p_valid_until IS NULL i brak voucher_expiry_day:
--     → v_valid_until pozostaje NULL
--     → UPDATE używa CASE WHEN ... THEN ... ELSE valid_until END
--       aby zachować istniejącą datę wygaśnięcia (ustawioną przez mint_vouchers)
--
-- Naprawa danych:
--   Rozszerzamy istniejące vouchery distributed/active gdzie valid_until
--   wypadł < issued_at + 2 miesiące (czyli złapane przez 1-miesięczny fallback)
--   a firma nie ma voucher_expiry_day — przesuwamy do issued_at + 12 miesięcy.
-- =============================================================================

DROP FUNCTION IF EXISTS distribute_to_employee(UUID, UUID, UUID, INTEGER, UUID, TIMESTAMPTZ);

CREATE FUNCTION distribute_to_employee(
  p_company_id    UUID,
  p_from_user_id  UUID,
  p_to_user_id    UUID,
  p_amount        INTEGER,
  p_order_id      UUID         DEFAULT NULL,
  p_valid_until   TIMESTAMPTZ  DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_expiry_day    INTEGER;
  v_expiry_hour   INTEGER;
  v_expiry_minute INTEGER;
  v_valid_until   TIMESTAMPTZ;
  v_distributed   INTEGER := 0;
BEGIN
  IF p_valid_until IS NOT NULL THEN
    v_valid_until := p_valid_until;
  ELSE
    SELECT voucher_expiry_day, voucher_expiry_hour, voucher_expiry_minute
    INTO v_expiry_day, v_expiry_hour, v_expiry_minute
    FROM companies WHERE id = p_company_id;

    IF v_expiry_day IS NOT NULL THEN
      v_valid_until := compute_voucher_valid_until(
        v_expiry_day,
        COALESCE(v_expiry_hour, 0),
        COALESCE(v_expiry_minute, 5)
      );
    ELSE
      -- Brak jawnej daty i brak dnia wygaśnięcia firmy.
      -- v_valid_until zostaje NULL — zachowamy istniejącą datę z mint_vouchers.
      NULL;
    END IF;
  END IF;

  WITH moved AS (
    UPDATE vouchers
    SET current_owner_id = p_to_user_id,
        status           = 'distributed',
        -- Nadpisuj valid_until tylko gdy mamy jawną datę;
        -- w przeciwnym razie zachowaj datę ustawioną przez mint_vouchers.
        valid_until      = CASE
                             WHEN v_valid_until IS NOT NULL THEN v_valid_until
                             ELSE valid_until
                           END
    WHERE id IN (
      SELECT id FROM vouchers
      WHERE company_id       = p_company_id
        AND current_owner_id = p_from_user_id
        AND status           IN ('active', 'created')
      ORDER BY issued_at ASC
      LIMIT p_amount
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_distributed FROM moved;

  IF v_distributed > 0 THEN
    UPDATE voucher_accounts
    SET balance = balance - v_distributed
    WHERE user_id = p_from_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Niewystarczające saldo voucherów (user_id: %)', p_from_user_id;
    END IF;

    INSERT INTO voucher_accounts (user_id, balance)
    VALUES (p_to_user_id, v_distributed)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = voucher_accounts.balance + v_distributed;

    INSERT INTO voucher_transactions (from_user_id, to_user_id, amount, type, order_id)
    VALUES (p_from_user_id, p_to_user_id, v_distributed, 'przekazanie', p_order_id);
  END IF;

  RETURN v_distributed;
END;
$$;

COMMENT ON FUNCTION distribute_to_employee IS
  'Przenosi vouchery od HR do pracownika. Poprawka 035: nie nadpisuje valid_until '
  'z mint_vouchers gdy p_valid_until IS NULL i firma nie ma voucher_expiry_day.';

-- =============================================================================
-- Naprawa istniejących danych:
-- Vouchery distributed/active z valid_until < issued_at + 2 miesiące
-- w firmach bez voucher_expiry_day zostały dotknięte przez 1-miesięczny fallback.
-- Przesuwamy je do pełnych 12 miesięcy od emisji.
-- =============================================================================
UPDATE vouchers v
SET valid_until = v.issued_at + INTERVAL '12 months'
WHERE v.status IN ('distributed', 'active')
  AND v.valid_until < v.issued_at + INTERVAL '2 months'
  AND v.company_id IN (
    SELECT id FROM companies WHERE voucher_expiry_day IS NULL
  );
