-- ========================================
-- 管理者フラグの追加
-- ========================================

-- usersテーブルに is_admin カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

COMMENT ON COLUMN users.is_admin IS '管理者フラグ（管理画面アクセス権限）';

-- インデックス追加（管理者の検索用）
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- 既存のユーザーで最初の管理者を設定する場合は、以下のコメントを外して実行してください
-- 例: user_id が 'admin' のユーザーを管理者にする
-- UPDATE users SET is_admin = true WHERE user_id = 'admin';
