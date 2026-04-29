-- ============================================================
-- Faz 7: Physical Assets, Shift Rotations & Swaps
-- ============================================================

-- 1. Demirbaş / Envanter (inventory) Tablosu
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  serial_no text,
  category text NOT NULL, -- Bilgisayar, Araç, Telefon, Diğer vb.
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
  value numeric DEFAULT 0,
  purchase_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ops_full_access_inventory" ON inventory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'client' AND profiles.company_id = inventory.company_id)
  );

-- Personel listelemek için kendi üzerine zimmetli olanları assignment üzerinden okur.
-- Sadece inventory öğelerini listelemesi için bir yetkiye gerek yok, assignment yetkisi ile inner join yapabilir.

-- 2. Zimmet Atamaları (asset_assignments)
CREATE TABLE IF NOT EXISTS asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  given_date date NOT NULL DEFAULT CURRENT_DATE,
  return_date date,
  condition_notes text,
  digital_signature text, -- Base64 encoded DataURL
  signature_date timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ops_full_access_assignments" ON asset_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'client' AND profiles.company_id = asset_assignments.company_id)
  );

-- Personel sadece kendine ait zimmetleri okuyabilir ve GÜNCELLEYEBİLİR (İmza atmak için)
CREATE POLICY "employee_manage_own_assignments" ON asset_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = asset_assignments.employee_id
        AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "employee_update_own_assignments" ON asset_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = asset_assignments.employee_id
        AND employees.user_id = auth.uid()
    )
  );

-- Demirbaş zimmetlendiğinde envanter durumunu güncelle
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE inventory SET status = 'assigned', updated_at = now() WHERE id = NEW.inventory_id;
  ELSIF NEW.status = 'returned' THEN
    UPDATE inventory SET status = 'available', updated_at = now() WHERE id = NEW.inventory_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_inventory_status ON asset_assignments;
CREATE TRIGGER tr_update_inventory_status
  AFTER INSERT OR UPDATE ON asset_assignments
  FOR EACH ROW EXECUTE FUNCTION update_inventory_status();


-- 3. Vardiya Rotasyonları (shift_rotations)
-- Çalışanlara haftalık/aylık rotasyon atamak için (örn: Sabah/Akşam döngüsü)
CREATE TABLE IF NOT EXISTS shift_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  pattern_days jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{"dayIndex": 1, "shift_id": "uuid"}, {"dayIndex": 2, "shift_id": "uuid"}]
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shift_rotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ops_full_access_rotations" ON shift_rotations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'client'))
  );


-- 4. Vardiya Değişim Talepleri (shift_swaps)
CREATE TABLE IF NOT EXISTS shift_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date_requested date NOT NULL,
  requester_shift_id uuid REFERENCES shifts(id),
  target_shift_id uuid REFERENCES shifts(id),
  status text NOT NULL DEFAULT 'pending_peer' CHECK (status IN ('pending_peer', 'pending_manager', 'approved', 'rejected')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shift_swaps ENABLE ROW LEVEL SECURITY;

-- Admins / Clients can see all, update all
CREATE POLICY "admin_ops_full_access_swaps" ON shift_swaps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'client'))
  );

-- Employees can see swaps they are part of, create swaps, and update if they are the target (to accept/reject)
CREATE POLICY "employee_read_own_swaps" ON shift_swaps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE (employees.id = shift_swaps.requester_id OR employees.id = shift_swaps.target_id)
        AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "employee_insert_own_swaps" ON shift_swaps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = shift_swaps.requester_id
        AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "employee_update_own_swaps" ON shift_swaps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE (employees.id = shift_swaps.requester_id OR employees.id = shift_swaps.target_id)
        AND employees.user_id = auth.uid()
    )
  );

-- Trigger: Notify peer on new swap request, and manager on peer approval
CREATE OR REPLACE FUNCTION notify_shift_swap()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending_peer' THEN
    -- Hedef çalışana bildirim gönder (çalışanın user_id'sini bulup atabiliriz, system_notifications company bazlı)
    INSERT INTO system_notifications (company_id, user_id, title, message, type, link)
    SELECT NEW.company_id, user_id, 'Vardiya Değişim Talebi', 'Bir çalışma arkadaşınız sizinle vardiya değişmek istiyor.', 'swap_request', '/employee/shift-swap'
    FROM employees WHERE id = NEW.target_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'pending_manager' AND OLD.status = 'pending_peer' THEN
    -- Peer onayladı, yöneticiye (client) bildirim gönder
    INSERT INTO system_notifications (company_id, title, message, type, link)
    VALUES (NEW.company_id, 'Vardiya Takası Onayı', 'İki çalışan vardiya değiştirmek için onayınızı bekliyor.', 'swap_approval', '/client/organization');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_shift_swap ON shift_swaps;
CREATE TRIGGER tr_notify_shift_swap
  AFTER INSERT OR UPDATE ON shift_swaps
  FOR EACH ROW EXECUTE FUNCTION notify_shift_swap();


-- 5. Mesai Uyarı Trigger'ı (Overtime Alert)
-- Gerçek bir senaryoda bu haftalık cron ile hesaplanır. Biz temsili olarak attendance_logs güncellendiğinde 
-- o haftanın toplam süresine bakıp bildirim atan bir yapı kuruyoruz.
CREATE OR REPLACE FUNCTION check_weekly_overtime()
RETURNS TRIGGER AS $$
DECLARE
  v_week_start date;
  v_week_end date;
  v_total_minutes int;
  v_45h_minutes int := 45 * 60;
BEGIN
  IF NEW.check_out IS NOT NULL THEN
    -- Hafta başı ve sonu
    v_week_start := date_trunc('week', NEW.check_out::date)::date;
    v_week_end := v_week_start + 6;
    
    -- O hafta için toplam süreyi bul
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (check_out - check_in))/60), 0)
    INTO v_total_minutes
    FROM attendance_logs
    WHERE employee_id = NEW.employee_id
      AND check_in::date >= v_week_start
      AND check_out::date <= v_week_end
      AND check_out IS NOT NULL;
      
    -- 45 saati (2700 dk) aşıyorsa
    IF v_total_minutes > v_45h_minutes THEN
      -- Daha önce bu hafta için bildirim atılmış mı kontrol et (Sürekli atmasın diye)
      IF NOT EXISTS (
        SELECT 1 FROM system_notifications 
        WHERE company_id = NEW.company_id 
          AND type = 'overtime_alert' 
          AND message LIKE '%' || v_week_start::text || '%'
          -- Tam teşekküllü bir kontrolde özel bir tablo veya JSON parametre gerekir
      ) THEN
        INSERT INTO system_notifications (company_id, title, message, type, link)
        VALUES (
          NEW.company_id, 
          'Fazla Mesai İhlali Uyarısı', 
          'Bir çalışanın haftalık çalışma süresi 45 saati aştı. (' || v_week_start::text || ' haftası)', 
          'overtime_alert', 
          '/client/attendance'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_weekly_overtime ON attendance_logs;
CREATE TRIGGER tr_check_weekly_overtime
  AFTER UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION check_weekly_overtime();
