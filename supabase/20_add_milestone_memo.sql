-- ========================================
-- マイルストーンにメモカラムを追加
-- ========================================

ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS memo TEXT;
