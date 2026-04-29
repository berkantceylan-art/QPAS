-- =============================================================
-- QPAS Core Tables Migration
-- Tablolar: attendance, requests, activity_log, payroll
-- =============================================================

-- 1. attendance — PDKS giriş/çıkış kayıtları
CREATE TABLE IF NOT EXISTS public.attendance (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type           text CHECK (type IN ('in','out')) NOT NULL,
  method         text CHECK (method IN ('qr','nfc','geo','manual')) DEFAULT 'geo',
  latitude       double precision,
  longitude      double precision,
  location_label text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON public.attendance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, created_at DESC);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Çalışan kendi kayıtlarını okur
CREATE POLICY "attendance_select_own" ON public.attendance
  FOR SELECT USING (auth.uid() = user_id);

-- Admin/client tüm kayıtları okur
CREATE POLICY "attendance_select_admin" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','client')
    )
  );

-- Çalışan kendi giriş/çıkışını yazar
CREATE POLICY "attendance_insert_own" ON public.attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 2. requests — İzin, avans, BES talepleri
CREATE TABLE IF NOT EXISTS public.requests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        text CHECK (type IN ('leave','advance','bes')) NOT NULL,
  status      text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  title       text NOT NULL,
  detail      text,
  amount      numeric,
  start_date  date,
  end_date    date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at DESC);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Çalışan kendi taleplerini okur
CREATE POLICY "requests_select_own" ON public.requests
  FOR SELECT USING (auth.uid() = user_id);

-- Admin/client tüm talepleri okur
CREATE POLICY "requests_select_admin" ON public.requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','client')
    )
  );

-- Çalışan talep oluşturur
CREATE POLICY "requests_insert_own" ON public.requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin/client talepleri günceller (onay/red)
CREATE POLICY "requests_update_admin" ON public.requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','client')
    )
  );


-- 3. activity_log — Sistem geneli aktivite kaydı
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name  text NOT NULL,
  action      text NOT NULL,
  category    text CHECK (category IN ('user','role','pdks','payroll','system','request')) DEFAULT 'system',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON public.activity_log(actor_id);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Admin/client tüm kayıtları okur
CREATE POLICY "activity_log_select_admin" ON public.activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','client')
    )
  );

-- Çalışan kendi aktivitelerini okur
CREATE POLICY "activity_log_select_own" ON public.activity_log
  FOR SELECT USING (auth.uid() = actor_id);

-- Herkes aktivite yazabilir (kendi adına)
CREATE POLICY "activity_log_insert" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = actor_id);


-- 4. payroll — Bordro kayıtları
CREATE TABLE IF NOT EXISTS public.payroll (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period        text NOT NULL,           -- '2026-04' formatında
  gross_salary  numeric NOT NULL DEFAULT 0,
  net_salary    numeric NOT NULL DEFAULT 0,
  deductions    numeric NOT NULL DEFAULT 0,
  overtime_pay  numeric NOT NULL DEFAULT 0,
  payment_date  date,
  status        text CHECK (status IN ('draft','published','paid')) DEFAULT 'draft',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_payroll_user_period ON public.payroll(user_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON public.payroll(period DESC);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Çalışan kendi bordrosunu okur (yalnızca published/paid)
CREATE POLICY "payroll_select_own" ON public.payroll
  FOR SELECT USING (
    auth.uid() = user_id AND status IN ('published','paid')
  );

-- Admin/client tüm bordroları okur
CREATE POLICY "payroll_select_admin" ON public.payroll
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','client')
    )
  );

-- Admin bordro oluşturur/günceller
CREATE POLICY "payroll_insert_admin" ON public.payroll
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "payroll_update_admin" ON public.payroll
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- 5. Helper view: Bugünkü PDKS sayısı (dashboard KPI)
CREATE OR REPLACE VIEW public.today_attendance_count AS
SELECT count(*) AS cnt
FROM public.attendance
WHERE type = 'in'
  AND created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul');

-- 6. Helper view: Haftalık PDKS günlük dağılım (grafik)
CREATE OR REPLACE VIEW public.weekly_attendance AS
SELECT
  date_trunc('day', created_at AT TIME ZONE 'Europe/Istanbul')::date AS day,
  count(*) FILTER (WHERE type = 'in')  AS check_ins,
  count(*) FILTER (WHERE type = 'out') AS check_outs
FROM public.attendance
WHERE created_at >= now() - interval '7 days'
GROUP BY 1
ORDER BY 1;
