-- CRM Contacts: individual people at prospect/client companies
CREATE TABLE IF NOT EXISTS crm_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  email         text,
  phone         text,
  position      text,
  company_name  text,
  company_id    uuid REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to   uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes         text,
  is_primary    boolean NOT NULL DEFAULT false
);

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_contacts_select" ON crm_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin','partner','menedzer','dyrektor')
    )
  );

CREATE POLICY "crm_contacts_insert" ON crm_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin','partner','menedzer','dyrektor')
    )
  );

CREATE POLICY "crm_contacts_update" ON crm_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin','partner','menedzer','dyrektor')
    )
  );

CREATE POLICY "crm_contacts_delete" ON crm_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin','dyrektor')
    )
  );

-- CRM Tasks
CREATE TABLE IF NOT EXISTS crm_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  title         text NOT NULL,
  description   text,
  due_date      date,
  status        text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','DONE','CANCELLED')),
  priority      text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH')),
  assigned_to   uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  lead_id       uuid REFERENCES leads(id) ON DELETE CASCADE,
  contact_id    uuid REFERENCES crm_contacts(id) ON DELETE SET NULL
);

ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_tasks_select" ON crm_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin','partner','menedzer','dyrektor')
    )
  );

CREATE POLICY "crm_tasks_insert" ON crm_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin','partner','menedzer','dyrektor')
    )
  );

CREATE POLICY "crm_tasks_update" ON crm_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin','partner','menedzer','dyrektor')
    )
  );

CREATE POLICY "crm_tasks_delete" ON crm_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin','dyrektor')
    )
  );

CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER crm_tasks_updated_at
  BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
