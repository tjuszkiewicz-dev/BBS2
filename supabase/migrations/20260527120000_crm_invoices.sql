-- Tabela crm_invoices — faktury VAT klientów + należna prowizja sprzedawcy.
-- Spec: docs/superpowers/specs/2026-05-27-roles-views-design.md (sekcja 6).

CREATE TABLE IF NOT EXISTS crm_invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES leads(id) ON DELETE SET NULL,
  offer_id        uuid REFERENCES crm_offers(id) ON DELETE SET NULL,
  issued_by       uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  invoice_number  text,
  amount_net      numeric(14,2) NOT NULL DEFAULT 0,
  vat_rate        numeric(5,2)  NOT NULL DEFAULT 23.00,
  vat_amount      numeric(14,2) GENERATED ALWAYS AS (ROUND(amount_net * vat_rate / 100, 2)) STORED,
  amount_gross    numeric(14,2) GENERATED ALWAYS AS (amount_net + ROUND(amount_net * vat_rate / 100, 2)) STORED,
  provision_pct   numeric(5,2)  NOT NULL DEFAULT 0,
  provision_amount numeric(14,2) GENERATED ALWAYS AS (ROUND(amount_net * provision_pct / 100, 2)) STORED,
  status          text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PAID','OVERDUE','CANCELLED')),
  issued_at       timestamptz,
  due_at          timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_invoices_issued_by ON crm_invoices(issued_by);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_lead_id   ON crm_invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_status    ON crm_invoices(status);
