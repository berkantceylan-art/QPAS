-- ============================================================
-- Faz 11: Vardiya Modülü Geliştirmesi
-- ============================================================

-- Yeni kolonlar ekle
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS entry_tolerance integer NOT NULL DEFAULT 15;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS exit_tolerance integer NOT NULL DEFAULT 15;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS working_hours numeric;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 15;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS meal_minutes integer NOT NULL DEFAULT 30;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_night_shift boolean NOT NULL DEFAULT false;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS saturday_active boolean NOT NULL DEFAULT false;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS sunday_active boolean NOT NULL DEFAULT false;

-- InventoryItem genişletme
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warranty_end date;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS assigned_date date;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS condition text DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor', 'broken'));
