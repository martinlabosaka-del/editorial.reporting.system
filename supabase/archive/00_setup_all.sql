-- ========================================
-- Supabase 完全セットアップスクリプト
-- ========================================
--
-- このスクリプトは、編集報告WEBアプリのSupabase環境を
-- 一括でセットアップするためのものです。
--
-- 使用方法:
-- 1. Supabase Studio > SQL Editor を開く
-- 2. このファイルの内容を全てコピー＆ペースト
-- 3. "Run" をクリックして実行
--
-- 注意:
-- - このスクリプトは新規プロジェクトでのみ実行してください
-- - 既存のテーブルがある場合、エラーが発生する可能性があります
-- ========================================

-- ========================================
-- STEP 1: テーブルスキーマの作成
-- ========================================

-- 1. users（ユーザーマスタ）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('part_time', 'staff', 'leader', 'executive')),
  is_active BOOLEAN DEFAULT true,
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);

-- 2. clients（クライアントマスタ）
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  agency_name TEXT,
  contact_person TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_clients_client_id ON clients(client_id);
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- 3. genres（ジャンルマスタ）
CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_id TEXT UNIQUE NOT NULL,
  genre_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_genres_display_order ON genres(display_order);

-- 4. technologies（使用技術マスタ）
CREATE TABLE technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id TEXT UNIQUE NOT NULL,
  tech_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_technologies_display_order ON technologies(display_order);

-- 5. estimate_items（見積項目マスタ）
CREATE TABLE estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_item_id TEXT UNIQUE NOT NULL,
  estimate_item_name TEXT NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_estimate_items_display_order ON estimate_items(display_order);

-- 6. edit_items（編集作業項目マスタ）
CREATE TABLE edit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edit_item_id TEXT UNIQUE NOT NULL,
  edit_item_name TEXT NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_edit_items_display_order ON edit_items(display_order);

-- 7. projects（案件マスタ）
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  project_name TEXT NOT NULL,
  agency_name TEXT,
  registration_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  main_editor UUID REFERENCES users(id) NOT NULL,
  sub_editors UUID[],
  director UUID REFERENCES users(id) NOT NULL,
  genres TEXT[],
  technologies TEXT[],
  estimate_pdf_url TEXT,
  estimate_total NUMERIC(12, 2),
  target_hours INTEGER,
  actual_hours INTEGER DEFAULT 0,
  file_storage_url TEXT,
  completed_urls JSONB,
  reflection TEXT,
  leader_message TEXT,
  leader_comment TEXT,
  other_notes TEXT,
  leader_rejection_reason TEXT,
  executive_rejection_reason TEXT,
  assigned_leader UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'leader_approved', 'executive_approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  leader_approved_at TIMESTAMPTZ,
  leader_approved_by UUID REFERENCES users(id),
  executive_approved_at TIMESTAMPTZ,
  executive_approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) NOT NULL
);

CREATE INDEX idx_projects_project_id ON projects(project_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_main_editor ON projects(main_editor);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_registration_date ON projects(registration_date);
CREATE INDEX idx_projects_delivery_date ON projects(delivery_date);

-- 8. estimate_breakdown（見積内訳）
CREATE TABLE estimate_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakdown_id TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  estimate_item_id UUID REFERENCES estimate_items(id) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimate_breakdown_project_id ON estimate_breakdown(project_id);
CREATE INDEX idx_estimate_breakdown_estimate_item_id ON estimate_breakdown(estimate_item_id);

-- 9. edit_history（編集履歴）
CREATE TABLE edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  editor UUID REFERENCES users(id) NOT NULL,
  edit_item_id UUID REFERENCES edit_items(id) NOT NULL,
  edit_time INTEGER NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edit_history_project_id ON edit_history(project_id);
CREATE INDEX idx_edit_history_editor ON edit_history(editor);
CREATE INDEX idx_edit_history_date ON edit_history(date);

-- 10. leader_evaluation（リーダー評価）
CREATE TABLE leader_evaluation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  required_skills_tech TEXT,
  required_skills_attitude TEXT,
  training_content_tech TEXT,
  training_content_attitude TEXT,
  other_notes TEXT,
  profit_amount NUMERIC(12, 2),
  profit_rate NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) NOT NULL
);

CREATE INDEX idx_leader_evaluation_project_id ON leader_evaluation(project_id);

-- 11. notifications（通知履歴）
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('submitted', 'approved', 'rejected')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_estimate_breakdown_updated_at
  BEFORE UPDATE ON estimate_breakdown
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 2: 初期データ投入
-- ========================================

-- ジャンルマスタ
INSERT INTO genres (genre_id, genre_name, display_order, is_active) VALUES
('GNR-001', '企業紹介', 1, true),
('GNR-002', 'プロモーション', 2, true),
('GNR-003', 'イベント', 3, true),
('GNR-004', '教育・研修', 4, true),
('GNR-005', 'セミナー', 5, true),
('GNR-006', 'ウェビナー', 6, true),
('GNR-007', 'CM', 7, true),
('GNR-008', 'ドキュメンタリー', 8, true),
('GNR-009', 'インタビュー', 9, true),
('GNR-010', 'その他', 10, true);

-- 使用技術マスタ
INSERT INTO technologies (tech_id, tech_name, display_order, is_active) VALUES
('TECH-001', 'Premiere Pro', 1, true),
('TECH-002', 'After Effects', 2, true),
('TECH-003', 'DaVinci Resolve', 3, true),
('TECH-004', 'Final Cut Pro', 4, true),
('TECH-005', 'Photoshop', 5, true),
('TECH-006', 'Illustrator', 6, true),
('TECH-007', 'Audition', 7, true),
('TECH-008', 'Cinema 4D', 8, true),
('TECH-009', 'Blender', 9, true),
('TECH-010', 'その他', 10, true);

-- 見積項目マスタ
INSERT INTO estimate_items (estimate_item_id, estimate_item_name, hourly_rate, display_order, is_active) VALUES
('EST-001', '編集作業', 3000.00, 1, true),
('EST-002', 'モーショングラフィックス', 4000.00, 2, true),
('EST-003', 'カラーグレーディング', 3500.00, 3, true),
('EST-004', '音声編集', 2800.00, 4, true),
('EST-005', 'テロップ作成', 2500.00, 5, true),
('EST-006', '素材作成', 3500.00, 6, true),
('EST-007', '3DCG制作', 5000.00, 7, true),
('EST-008', 'その他', 3000.00, 8, true);

-- 編集作業項目マスタ
INSERT INTO edit_items (edit_item_id, edit_item_name, hourly_rate, display_order, is_active) VALUES
('EDIT-001', '粗編集', 2500.00, 1, true),
('EDIT-002', '本編集', 3000.00, 2, true),
('EDIT-003', 'エフェクト作業', 4000.00, 3, true),
('EDIT-004', '音声編集', 2800.00, 4, true),
('EDIT-005', 'カラーコレクション', 3500.00, 5, true),
('EDIT-006', 'テロップ入れ', 2500.00, 6, true),
('EDIT-007', '修正対応', 2800.00, 7, true),
('EDIT-008', 'その他', 2500.00, 8, true);

-- サンプルクライアント
INSERT INTO clients (client_id, client_name, agency_name, is_active) VALUES
('CLI-0001', 'サンプル株式会社', '広告代理店A', true),
('CLI-0002', 'テスト企業', NULL, true),
('CLI-0003', 'デモカンパニー', '広告代理店B', true);

-- ========================================
-- STEP 3: セットアップ完了確認
-- ========================================

SELECT
  'セットアップが完了しました！' as message,
  (SELECT COUNT(*) FROM genres) as genres_count,
  (SELECT COUNT(*) FROM technologies) as tech_count,
  (SELECT COUNT(*) FROM estimate_items) as estimate_items_count,
  (SELECT COUNT(*) FROM edit_items) as edit_items_count,
  (SELECT COUNT(*) FROM clients) as clients_count;

-- ========================================
-- 次のステップ
-- ========================================

-- 1. Row Level Security (RLS) ポリシーを設定
--    → supabase/02_rls_policies.sql を実行
--
-- 2. PostgreSQL関数とトリガーを作成
--    → supabase/03_functions.sql を実行
--
-- 3. Supabase Storageをセットアップ
--    → Supabase Studio > Storage でバケット作成
--    → supabase/04_storage_setup.sql を実行
--
-- 4. テストユーザーを作成
--    → Authentication > Users > Add User
--    → Email: test.user@example.com
--    → Password: testpass123
--    → 作成後、users テーブルに登録
