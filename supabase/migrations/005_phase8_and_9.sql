-- ============================================================
-- Faz 8 & 9: İSG, Eğitim, Performans ve Finansal Raporlar
-- ============================================================

-- 1. Sertifikalar ve İSG (Certifications) Tablosu
CREATE TABLE IF NOT EXISTS certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('ohs_medical', 'ohs_training', 'professional_training')),
  issue_date date,
  expiry_date date,
  provider text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ops_full_access_certifications" ON certifications;
CREATE POLICY "admin_ops_full_access_certifications" ON certifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'client'))
  );

DROP POLICY IF EXISTS "employee_read_own_certifications" ON certifications;
CREATE POLICY "employee_read_own_certifications" ON certifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = certifications.employee_id
        AND employees.user_id = auth.uid()
    )
  );

-- OHS Süresi dolan / dolmak üzere olanlar için Trigger (Hem Yöneticilere Hem Çalışana)
-- Gerçek bir sistemde pg_cron ile her gece çalışır. Biz temsili olarak INSERT/UPDATE anında 
-- eger expiry_date < (now() + 15 days) ise bildirim atacağız.
CREATE OR REPLACE FUNCTION notify_expiring_certifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= (CURRENT_DATE + INTERVAL '15 days') THEN
    -- Çalışana bildirim at (user_id'si varsa)
    IF EXISTS (SELECT 1 FROM employees WHERE id = NEW.employee_id AND user_id IS NOT NULL) THEN
      INSERT INTO system_notifications (company_id, user_id, title, message, type, link)
      SELECT NEW.company_id, user_id, 'Sertifika / Muayene Uyarısı', NEW.name || ' belgenizin/muayenenizin süresi dolmak üzere. Lütfen İK ile iletişime geçin.', 'ohs_alert', '/employee/assets'
      FROM employees WHERE id = NEW.employee_id;
    END IF;

    -- Yöneticiye (Tüm şirket client yöneticilerine ortak) bildirim at
    -- Sadece 1 defa atmak için basit bir kontrol
    IF NOT EXISTS (
      SELECT 1 FROM system_notifications 
      WHERE company_id = NEW.company_id 
        AND type = 'ohs_alert_admin' 
        AND message LIKE '%' || NEW.name || '%'
    ) THEN
      INSERT INTO system_notifications (company_id, title, message, type, link)
      VALUES (NEW.company_id, 'İSG/Eğitim Süre Uyarısı', 'Bir personelin ' || NEW.name || ' belgesinin süresi dolmak üzere (15 günden az).', 'ohs_alert_admin', '/client/organization');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_expiring_certifications ON certifications;
CREATE TRIGGER tr_notify_expiring_certifications
  AFTER INSERT OR UPDATE ON certifications
  FOR EACH ROW EXECUTE FUNCTION notify_expiring_certifications();


-- 2. Performans Değerlendirmeleri (Performance Reviews)
CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES employees(id) ON DELETE SET NULL, -- Kim değerlendirdi (Opsiyonel Müdür)
  period_name text NOT NULL, -- Örn: 2026-Q1
  kpi_score numeric CHECK (kpi_score >= 0 AND kpi_score <= 100),
  feedback_notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ops_full_access_performance" ON performance_reviews;
CREATE POLICY "admin_ops_full_access_performance" ON performance_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'client'))
  );

DROP POLICY IF EXISTS "employee_read_own_performance" ON performance_reviews;
CREATE POLICY "employee_read_own_performance" ON performance_reviews
  FOR SELECT USING (
    status = 'completed' AND -- Sadece tamamlanmışları görebilir
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = performance_reviews.employee_id
        AND employees.user_id = auth.uid()
    )
  );
