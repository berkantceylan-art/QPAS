-- ============================================================
-- Faz 6: Payroll Engine & Legal Automation
-- ============================================================

-- 1. Employees Tablosu Güncellemeleri
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_degree int NOT NULL DEFAULT 0 CHECK (disability_degree >= 0 AND disability_degree <= 3),
  ADD COLUMN IF NOT EXISTS is_part_time boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_salary numeric;

-- Mevcut salary alanını total_agreed_salary (Anlaşılan Maaş) olarak kullanacağız.
-- Geriye dönük uyumluluk için adını değiştirmiyoruz, ancak UI'da total_agreed_salary olarak göstereceğiz.
-- Official_salary boşsa, asgari ücret seviyesinden yatar varsayılacak.

-- 2. Yasal Parametreler Tablosu (payroll_parameters)
CREATE TABLE IF NOT EXISTS payroll_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int, -- Eğer NULL ise tüm yıl için geçerli
  min_wage_gross numeric NOT NULL DEFAULT 0,
  min_wage_net numeric NOT NULL DEFAULT 0,
  sgk_floor numeric NOT NULL DEFAULT 0,
  sgk_ceiling numeric NOT NULL DEFAULT 0,
  stamp_tax_rate numeric NOT NULL DEFAULT 0.00759,
  disability_discount_1 numeric NOT NULL DEFAULT 0,
  disability_discount_2 numeric NOT NULL DEFAULT 0,
  disability_discount_3 numeric NOT NULL DEFAULT 0,
  tax_brackets jsonb NOT NULL DEFAULT '[]'::jsonb, 
  -- Örn: [{"limit": 110000, "rate": 15}, {"limit": 230000, "rate": 20}]
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, year, month)
);

ALTER TABLE payroll_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_payroll_params" ON payroll_parameters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "client_company_payroll_params" ON payroll_parameters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'client'
        AND profiles.company_id = payroll_parameters.company_id
    )
  );

-- 3. Bordrolar Tablosu (payrolls)
CREATE TABLE IF NOT EXISTS payrolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year int NOT NULL,
  period_month int NOT NULL,
  
  -- Çalışma süreleri
  worked_days numeric NOT NULL DEFAULT 0,
  
  -- Resmi Bordro (Bankaya yatacak yasal tutar)
  official_gross numeric NOT NULL DEFAULT 0,
  official_net numeric NOT NULL DEFAULT 0,
  sgk_employee numeric NOT NULL DEFAULT 0,
  sgk_employer numeric NOT NULL DEFAULT 0,
  income_tax numeric NOT NULL DEFAULT 0,
  stamp_tax numeric NOT NULL DEFAULT 0,
  
  -- Kesintiler
  advance_deduction numeric NOT NULL DEFAULT 0,
  
  -- Genel Toplam (Özel İstek Alanları)
  total_agreed_salary numeric NOT NULL DEFAULT 0, -- Çalışanla anlaşılan toplam hakediş (Elden+Resmi)
  cash_difference numeric NOT NULL DEFAULT 0, -- Elden Ödenecek Fark
  total_employer_cost numeric NOT NULL DEFAULT 0, -- İşverene Toplam Maliyet (Resmi Brüt + İşveren SGK + Elden Fark)
  
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, period_year, period_month)
);

ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_payrolls" ON payrolls
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "client_company_payrolls" ON payrolls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'client'
        AND profiles.company_id = payrolls.company_id
    )
  );

-- Çalışan sadece KENDİ kesinleşmiş bordrosunu görebilir
CREATE POLICY "employee_read_own_payrolls" ON payrolls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = payrolls.employee_id
        AND employees.user_id = auth.uid()
    ) AND status = 'finalized'
  );


-- 4. Sistem Bildirimleri (system_notifications)
CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Belirli bir kullanıcıya ise
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- 'pending_approval', 'missing_log', 'system' vs.
  link text, -- Tıklanınca gidilecek URL
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_notifications" ON system_notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = system_notifications.company_id AND profiles.role IN ('admin','client')
    ))
  );

CREATE POLICY "user_update_own_notifications" ON system_notifications
  FOR UPDATE USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = system_notifications.company_id AND profiles.role IN ('admin','client')
    ))
  );


-- 5. Trigger: Avans Talebi Bildirimi
CREATE OR REPLACE FUNCTION notify_financial_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending_manager' THEN
    INSERT INTO system_notifications (company_id, title, message, type, link)
    VALUES (
      NEW.company_id,
      'Yeni Avans/Kredi Talebi',
      'Bir çalışan yeni bir finansal talepte bulundu. Onayınız bekleniyor.',
      'pending_approval',
      '/client/finance'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_financial_request_notify ON financial_requests;
CREATE TRIGGER tr_financial_request_notify
  AFTER INSERT ON financial_requests
  FOR EACH ROW EXECUTE FUNCTION notify_financial_request();


-- 6. RPC: Bordro Hesaplama Motoru (calculate_payroll)
-- Bu fonksiyon tamamen PostgreSQL seviyesinde net-brüt ve işveren maliyet hesabı yapar.
CREATE OR REPLACE FUNCTION calculate_payroll(p_company_id uuid, p_year int, p_month int)
RETURNS void AS $$
DECLARE
  v_params record;
  v_emp record;
  v_official_gross numeric;
  v_official_net numeric;
  v_total_agreed numeric;
  v_sgk_base numeric;
  v_sgk_employee numeric;
  v_sgk_employer numeric;
  v_income_tax_base numeric;
  v_income_tax numeric;
  v_stamp_tax numeric;
  v_cash_diff numeric;
  v_employer_cost numeric;
  v_advances numeric;
  v_disability_discount numeric;
  v_worked_days numeric;
BEGIN
  -- 1. İlgili dönemin yasal parametrelerini al
  SELECT * INTO v_params 
  FROM payroll_parameters 
  WHERE company_id = p_company_id 
    AND year = p_year 
    AND (month = p_month OR month IS NULL)
  ORDER BY month DESC NULLS LAST 
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bu dönem için yasal parametreler (payroll_parameters) bulunamadı.';
  END IF;

  -- 2. Aktif çalışanları dön
  FOR v_emp IN (SELECT * FROM employees WHERE company_id = p_company_id AND status = 'active') LOOP
    
    -- Anlaşılan Toplam Maaş (Eğer girilmemişse asgari ücret neti varsay)
    v_total_agreed := COALESCE(v_emp.salary, v_params.min_wage_net);
    
    -- Resmi Brüt Maaş (Eğer girilmişse al, girilmemişse asgari brüt varsay)
    v_official_gross := COALESCE(v_emp.official_salary, v_params.min_wage_gross);
    
    -- Basit bir worked_days varsayımı (30 gün üzerinden). Gelişmiş sürümde attendance_logs'dan bakılır.
    v_worked_days := 30;
    IF v_emp.is_part_time THEN
      v_worked_days := 15; -- Örnek part time mantığı
      v_official_gross := v_official_gross / 2;
    END IF;

    -- SGK Matrahı (Taban ve Tavan kontrolleri)
    v_sgk_base := v_official_gross;
    IF v_sgk_base < v_params.sgk_floor THEN v_sgk_base := v_params.sgk_floor; END IF;
    IF v_sgk_base > v_params.sgk_ceiling THEN v_sgk_base := v_params.sgk_ceiling; END IF;

    -- Emekli vs Normal SGK oranları
    IF v_emp.is_retired THEN
      v_sgk_employee := v_sgk_base * 0.075; -- Örnek: SGDP %7.5 işçi
      v_sgk_employer := v_sgk_base * 0.245; -- Örnek: SGDP %24.5 işveren
    ELSE
      v_sgk_employee := v_sgk_base * 0.14; -- Normal %14 işçi (İşsizlik hariç basitleştirilmiş)
      v_sgk_employer := v_sgk_base * 0.205; -- Normal %20.5 işveren
    END IF;

    -- Engellilik İndirimi
    v_disability_discount := 0;
    IF v_emp.disability_degree = 1 THEN v_disability_discount := v_params.disability_discount_1;
    ELSIF v_emp.disability_degree = 2 THEN v_disability_discount := v_params.disability_discount_2;
    ELSIF v_emp.disability_degree = 3 THEN v_disability_discount := v_params.disability_discount_3;
    END IF;

    -- Gelir Vergisi Matrahı
    v_income_tax_base := v_official_gross - v_sgk_employee - v_disability_discount;
    IF v_income_tax_base < 0 THEN v_income_tax_base := 0; END IF;
    
    -- Gelir Vergisi Hesaplama (Basitleştirilmiş İlk Dilim, JSONB'den okunabilir)
    v_income_tax := v_income_tax_base * 0.15; -- Varsayılan %15 (Dilim hesabı JSON okumasıyla genişletilecek)
    
    -- Asgari Ücret İstisnası (Kaba taslak)
    -- Resmi brüt asgari ücrete eşit veya düşükse GV=0
    IF v_official_gross <= v_params.min_wage_gross THEN
      v_income_tax := 0;
    END IF;

    -- Damga Vergisi
    v_stamp_tax := v_official_gross * v_params.stamp_tax_rate;
    IF v_official_gross <= v_params.min_wage_gross THEN
      v_stamp_tax := 0; -- Asgari ücret istisnası
    END IF;

    -- Resmi Net Maaş
    v_official_net := v_official_gross - v_sgk_employee - v_income_tax - v_stamp_tax;

    -- Avans / Borç Kesintileri (financial_requests tablosundan)
    SELECT COALESCE(SUM(monthly_deduction), 0) INTO v_advances
    FROM financial_requests
    WHERE employee_id = v_emp.id AND status = 'approved'; 
    -- Gerçek sistemde repayment history (borç defteri) tablosuna bakılır. 
    -- Şimdilik 0 varsayıyoruz veya basitleştiriyoruz.
    v_advances := 0;

    -- Toplam Maaş ve Elden Farkı
    v_cash_diff := v_total_agreed - v_official_net;
    IF v_cash_diff < 0 THEN v_cash_diff := 0; END IF;

    -- İşveren Toplam Maliyeti (Resmi Brüt + İşveren SGK + Elden Fark)
    v_employer_cost := v_official_gross + v_sgk_employer + v_cash_diff;

    -- Payrolls tablosuna Upsert (Çakışma varsa güncelle)
    INSERT INTO payrolls (
      company_id, employee_id, period_year, period_month, worked_days,
      official_gross, official_net, sgk_employee, sgk_employer,
      income_tax, stamp_tax, advance_deduction,
      total_agreed_salary, cash_difference, total_employer_cost, status
    ) VALUES (
      p_company_id, v_emp.id, p_year, p_month, v_worked_days,
      v_official_gross, v_official_net, v_sgk_employee, v_sgk_employer,
      v_income_tax, v_stamp_tax, v_advances,
      v_total_agreed, v_cash_diff, v_employer_cost, 'draft'
    )
    ON CONFLICT (employee_id, period_year, period_month) 
    DO UPDATE SET 
      worked_days = EXCLUDED.worked_days,
      official_gross = EXCLUDED.official_gross,
      official_net = EXCLUDED.official_net,
      sgk_employee = EXCLUDED.sgk_employee,
      sgk_employer = EXCLUDED.sgk_employer,
      income_tax = EXCLUDED.income_tax,
      stamp_tax = EXCLUDED.stamp_tax,
      advance_deduction = EXCLUDED.advance_deduction,
      total_agreed_salary = EXCLUDED.total_agreed_salary,
      cash_difference = EXCLUDED.cash_difference,
      total_employer_cost = EXCLUDED.total_employer_cost,
      updated_at = now();
      
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
