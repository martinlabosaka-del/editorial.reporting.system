-- ========================================
-- 案件マイルストーン（進捗管理）テーブルの追加
-- ========================================

-- マイルストーンテーブル
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  planned_date DATE,
  completed_date DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_order ON project_milestones(project_id, display_order);

-- RLSを有効化
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 認証済みユーザーは全操作可能
CREATE POLICY "project_milestones_select_authenticated" ON project_milestones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_milestones_all_authenticated" ON project_milestones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_atの自動更新トリガー
CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
