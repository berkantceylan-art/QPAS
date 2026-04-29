-- ============================================================
-- Faz 10: Dijital Özlük Dosyası & Evrak Otomasyonu
-- ============================================================

-- 1. employee_documents tablosuna expiry_date ekleme
-- Önceden var olan tabloyu ALTER komutuyla genişletiyoruz.
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS expiry_date date;

-- doc_type check constraint'ini kaldırma veya esnekleştirme ihtiyacı olabilir. 
-- Mevcut durumda check constraint varsa onu drop edip yenisini ekleyebiliriz.
-- (Bunu Supabase tarafında UI'dan da görebiliriz, ama biz yeni değerleri serbest bırakmak için 
--  eğer kısıtlama varsa kaldıracağız. Eğer 'text' ise zaten sorun yok, TS tipleriyle kısıtlıyoruz).

-- 2. Zorunlu Evrak Kuralları (document_requirements)
CREATE TABLE IF NOT EXISTS document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  doc_type text NOT NULL, -- 'identity', 'contract', 'criminal_record', 'health_report', 'diploma', 'military_status', 'family_registry', 'kvkk_consent', 'other'
  job_title_id uuid REFERENCES job_titles(id) ON DELETE CASCADE, -- Belirli bir unvan için mi? (null ise herkese zorunlu)
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE, -- Belirli bir departman için mi?
  is_mandatory boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ops_full_access_doc_reqs" ON document_requirements;
CREATE POLICY "admin_ops_full_access_doc_reqs" ON document_requirements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'client'))
  );

-- 3. KVKK Denetim Logları (document_audit_logs)
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Bakan kişi
  document_id uuid NOT NULL REFERENCES employee_documents(id) ON DELETE CASCADE, -- Bakılan dosya
  action text NOT NULL CHECK (action IN ('view', 'download')),
  ip_address text, -- Opsiyonel
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_audit_logs ENABLE ROW LEVEL SECURITY;

-- Denetim loglarını sadece admin/client görebilir.
DROP POLICY IF EXISTS "admin_ops_full_access_doc_audits" ON document_audit_logs;
CREATE POLICY "admin_ops_full_access_doc_audits" ON document_audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'client'))
  );

-- 4. Bitiş Süresi Yaklaşan Evraklar için Otomasyon (Trigger)
CREATE OR REPLACE FUNCTION notify_expiring_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN
    -- Sadece 1 defa atmak için basit kontrol
    IF NOT EXISTS (
      SELECT 1 FROM system_notifications 
      WHERE company_id = NEW.company_id 
        AND type = 'doc_expiry_alert' 
        AND message LIKE '%' || NEW.file_name || '%'
    ) THEN
      INSERT INTO system_notifications (company_id, title, message, type, link)
      VALUES (NEW.company_id, 'Evrak Süresi Doluyor', NEW.file_name || ' adlı evrağın bitiş süresine 30 günden az kaldı.', 'doc_expiry_alert', '/client/organization');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_expiring_documents ON employee_documents;
CREATE TRIGGER tr_notify_expiring_documents
  AFTER INSERT OR UPDATE ON employee_documents
  FOR EACH ROW EXECUTE FUNCTION notify_expiring_documents();
