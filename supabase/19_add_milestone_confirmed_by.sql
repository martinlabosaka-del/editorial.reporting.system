-- ========================================
-- マイルストーンに確認者カラムを追加
-- ========================================

ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES users(id);
