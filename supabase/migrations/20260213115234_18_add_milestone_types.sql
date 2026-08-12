-- ========================================
-- マイルストーン工程タイプのマスタテーブル
-- ========================================

CREATE TABLE IF NOT EXISTS milestone_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE milestone_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestone_types_select_authenticated" ON milestone_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "milestone_types_all_authenticated" ON milestone_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- デフォルトデータ
INSERT INTO milestone_types (type_name, display_order) VALUES
  ('白パケ', 1),
  ('稿', 2),
  ('社内確認', 3),
  ('先方確認', 4),
  ('修正', 5),
  ('納品', 6)
ON CONFLICT (type_name) DO NOTHING;
