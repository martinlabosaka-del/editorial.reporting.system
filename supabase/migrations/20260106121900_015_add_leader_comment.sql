-- ========================================
-- leader_comment カラムを追加
-- 上長から役員への評価コメント
-- ========================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS leader_comment TEXT;

COMMENT ON COLUMN projects.leader_comment IS '上長から役員への評価コメント（①編集者に必要な要素、②教育内容、③その他）';
