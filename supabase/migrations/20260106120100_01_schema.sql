-- ========================================
-- 編集報告WEBアプリ - Supabaseデータベーススキーマ
-- ========================================

-- ========================================
-- 1. users（ユーザーマスタ）
-- ========================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,  -- ログインID（例：yamada.taro）
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('part_time', 'staff', 'leader', 'executive')),
  is_active BOOLEAN DEFAULT true,
  auth_user_id UUID REFERENCES auth.users(id),  -- Supabase Authとの紐付け
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);

-- コメント
COMMENT ON TABLE users IS 'ユーザーマスタ';
COMMENT ON COLUMN users.user_id IS 'ログインID';
COMMENT ON COLUMN users.role IS '権限: part_time, staff, leader, executive';
COMMENT ON COLUMN users.auth_user_id IS 'Supabase Auth User ID';

-- ========================================
-- 2. clients（クライアントマスタ）
-- ========================================

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

COMMENT ON TABLE clients IS 'クライアントマスタ';

-- ========================================
-- 3. genres（ジャンルマスタ）
-- ========================================

CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_id TEXT UNIQUE NOT NULL,
  genre_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_genres_display_order ON genres(display_order);

COMMENT ON TABLE genres IS 'ジャンルマスタ';

-- ========================================
-- 4. technologies（使用技術マスタ）
-- ========================================

CREATE TABLE technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id TEXT UNIQUE NOT NULL,
  tech_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_technologies_display_order ON technologies(display_order);

COMMENT ON TABLE technologies IS '使用技術マスタ';

-- ========================================
-- 5. estimate_items（見積項目マスタ）
-- ========================================

CREATE TABLE estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_item_id TEXT UNIQUE NOT NULL,
  estimate_item_name TEXT NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_estimate_items_display_order ON estimate_items(display_order);

COMMENT ON TABLE estimate_items IS '見積項目マスタ';

-- ========================================
-- 6. edit_items（編集作業項目マスタ）
-- ========================================

CREATE TABLE edit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edit_item_id TEXT UNIQUE NOT NULL,
  edit_item_name TEXT NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_edit_items_display_order ON edit_items(display_order);

COMMENT ON TABLE edit_items IS '編集作業項目マスタ';

-- ========================================
-- 7. projects（案件マスタ）
-- ========================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT UNIQUE NOT NULL,  -- PRJ-YYYYMMDD-001
  client_id UUID REFERENCES clients(id) NOT NULL,
  project_name TEXT NOT NULL,
  agency_name TEXT,
  registration_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  main_editor UUID REFERENCES users(id) NOT NULL,
  sub_editors UUID[],  -- 配列型でサブ編集者のIDを保存
  director UUID REFERENCES users(id) NOT NULL,
  genres TEXT[],
  technologies TEXT[],
  estimate_pdf_url TEXT,  -- Supabase StorageのパスまたはURL
  estimate_total NUMERIC(12, 2),
  target_hours INTEGER,  -- 分単位
  actual_hours INTEGER DEFAULT 0,  -- 分単位
  file_storage_url TEXT,
  completed_urls JSONB,  -- JSON形式で複数URL保存
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

-- インデックス
CREATE INDEX idx_projects_project_id ON projects(project_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_main_editor ON projects(main_editor);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_registration_date ON projects(registration_date);
CREATE INDEX idx_projects_delivery_date ON projects(delivery_date);

COMMENT ON TABLE projects IS '案件マスタ';
COMMENT ON COLUMN projects.status IS 'draft:下書き, submitted:申請中, leader_approved:リーダー承認済, executive_approved:役員承認済, rejected:差戻';

-- ========================================
-- 8. estimate_breakdown（見積内訳）
-- ========================================

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

COMMENT ON TABLE estimate_breakdown IS '見積内訳';

-- ========================================
-- 9. edit_history（編集履歴）
-- ========================================

CREATE TABLE edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id TEXT UNIQUE NOT NULL,  -- HIS-YYYYMMDD-001
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  editor UUID REFERENCES users(id) NOT NULL,
  estimate_item UUID REFERENCES estimate_items(id) NOT NULL,
  edit_time INTEGER NOT NULL,  -- 分単位
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edit_history_project_id ON edit_history(project_id);
CREATE INDEX idx_edit_history_editor ON edit_history(editor);
CREATE INDEX idx_edit_history_date ON edit_history(date);

COMMENT ON TABLE edit_history IS '編集履歴';

-- ========================================
-- 10. leader_evaluation（リーダー評価）
-- ========================================

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

COMMENT ON TABLE leader_evaluation IS 'リーダー評価';

-- ========================================
-- 11. notifications（通知履歴）
-- ========================================

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

COMMENT ON TABLE notifications IS '通知履歴';

-- ========================================
-- Updated_at自動更新トリガー
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- projects
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- estimate_breakdown
CREATE TRIGGER trg_estimate_breakdown_updated_at
  BEFORE UPDATE ON estimate_breakdown
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
