-- ========================================
-- 所属(affiliations)とチーム(teams)テーブルの追加
-- ========================================

-- 所属マスタテーブル
CREATE TABLE IF NOT EXISTS affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliation_id TEXT UNIQUE NOT NULL,
  affiliation_name TEXT NOT NULL,
  color_code TEXT DEFAULT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- チームマスタテーブル
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT UNIQUE NOT NULL,
  team_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- usersテーブルに所属・チームカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliation_id UUID REFERENCES affiliations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_affiliation_id ON users(affiliation_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);

-- RLSを有効化
ALTER TABLE affiliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 認証済みユーザーは読み取り可能
CREATE POLICY "affiliations_select_authenticated" ON affiliations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "affiliations_all_authenticated" ON affiliations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "teams_select_authenticated" ON teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "teams_all_authenticated" ON teams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
