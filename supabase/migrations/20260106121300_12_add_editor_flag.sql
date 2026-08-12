-- ========================================
-- 動画編集者フラグの追加
-- ========================================

-- usersテーブルに is_editor カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_editor BOOLEAN DEFAULT false;

COMMENT ON COLUMN users.is_editor IS '動画編集者フラグ（メイン編集者・サブ編集者・ディレクターとして選択可能）';

-- インデックス追加（編集者の検索用）
CREATE INDEX IF NOT EXISTS idx_users_is_editor ON users(is_editor);

-- 既存のスタッフを編集者として設定する場合は、以下のコメントを外して実行してください
-- 例: role が 'staff' または 'part_time' のユーザーを編集者にする
-- UPDATE users SET is_editor = true WHERE role IN ('staff', 'part_time');
