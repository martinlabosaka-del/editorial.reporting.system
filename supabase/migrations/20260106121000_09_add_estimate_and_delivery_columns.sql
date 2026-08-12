-- ========================================
-- 見積番号と実納期カラムの追加
-- ========================================

-- projectsテーブルに estimate_number カラムを追加
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimate_number TEXT;

-- projectsテーブルに actual_delivery_date カラムを追加
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_delivery_date DATE;

-- コメント追加
COMMENT ON COLUMN projects.estimate_number IS '見積番号';
COMMENT ON COLUMN projects.actual_delivery_date IS '実際の納品日';

-- インデックス追加（検索用）
CREATE INDEX IF NOT EXISTS idx_projects_estimate_number ON projects(estimate_number);
CREATE INDEX IF NOT EXISTS idx_projects_actual_delivery_date ON projects(actual_delivery_date);
