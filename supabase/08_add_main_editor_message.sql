-- ========================================
-- メイン編集者から上長へのメッセージカラム追加
-- ========================================

-- projectsテーブルに main_editor_message カラムを追加
ALTER TABLE projects ADD COLUMN IF NOT EXISTS main_editor_message TEXT;

COMMENT ON COLUMN projects.main_editor_message IS 'メイン編集者から上長へのメッセージ（サポートしてほしい点など）';

-- reflection カラムのコメントも明確化
COMMENT ON COLUMN projects.reflection IS 'メイン編集者の振り返り（編集作業を終えての振り返り）';
COMMENT ON COLUMN projects.other_notes IS 'メイン編集者のその他気づいた点';
COMMENT ON COLUMN projects.leader_message IS '上長からのフィードバックメッセージ';
