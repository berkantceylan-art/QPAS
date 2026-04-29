-- ============================================================
-- Faz 5: RBAC (custom_roles) + Import Jobs
-- ============================================================

-- 1. custom_roles — firma bazlı yetki rolleri
CREATE TABLE IF NOT EXISTS custom_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- Admin her şeyi görebilir
CREATE POLICY "admin_full_access_custom_roles" ON custom_roles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Client kendi firmasının rollerini yönetebilir
CREATE POLICY "client_company_custom_roles" ON custom_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'client'
        AND profiles.company_id = custom_roles.company_id
    )
  );

-- Employee kendi firmasının rollerini okuyabilir
CREATE POLICY "employee_read_custom_roles" ON custom_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'employee'
        AND profiles.company_id = custom_roles.company_id
    )
  );

-- 2. employees tablosuna custom_role_id FK ekle
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS custom_role_id uuid REFERENCES custom_roles(id) ON DELETE SET NULL;

-- 3. import_jobs — dosya import geçmişi
CREATE TABLE IF NOT EXISTS import_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by     uuid NOT NULL REFERENCES auth.users(id),
  file_name       text NOT NULL,
  file_size_bytes bigint,
  status          text NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing','completed','failed')),
  total_rows      int NOT NULL DEFAULT 0,
  imported_rows   int NOT NULL DEFAULT 0,
  skipped_rows    int NOT NULL DEFAULT 0,
  error_rows      int NOT NULL DEFAULT 0,
  errors          jsonb DEFAULT '[]'::jsonb,
  column_mapping  jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Admin tüm import job'ları görebilir
CREATE POLICY "admin_full_access_import_jobs" ON import_jobs
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Client kendi firmasının import geçmişini yönetebilir
CREATE POLICY "client_company_import_jobs" ON import_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'client'
        AND profiles.company_id = import_jobs.company_id
    )
  );

-- 4. Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS custom_roles_updated_at ON custom_roles;
CREATE TRIGGER custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
