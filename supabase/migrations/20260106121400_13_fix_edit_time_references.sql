-- ========================================
-- 編集時間関連の修正とRLSポリシー追加
-- ========================================

-- ========================================
-- 1. completed_urlsテーブルの作成
-- ========================================

CREATE TABLE IF NOT EXISTS completed_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_id TEXT UNIQUE NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_completed_urls_project_id ON completed_urls(project_id);
CREATE INDEX IF NOT EXISTS idx_completed_urls_url_id ON completed_urls(url_id);

-- ========================================
-- 2. RPC関数の追加
-- ========================================

-- 2.1. generate_time_id関数を追加（edit_historyのIDを生成）
CREATE OR REPLACE FUNCTION generate_time_id()
RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  counter INTEGER;
  new_id TEXT;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 今日の最大カウンターを取得
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(history_id FROM 'HIS-[0-9]{8}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM edit_history
  WHERE history_id LIKE 'HIS-' || today_str || '-%';

  new_id := 'HIS-' || today_str || '-' || LPAD(counter::TEXT, 6, '0');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 2.2. generate_url_id関数を追加（完成品URLのIDを生成）
CREATE OR REPLACE FUNCTION generate_url_id()
RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  counter INTEGER;
  new_id TEXT;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 今日の最大カウンターを取得
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(url_id FROM 'URL-[0-9]{8}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM completed_urls
  WHERE url_id LIKE 'URL-' || today_str || '-%';

  new_id := 'URL-' || today_str || '-' || LPAD(counter::TEXT, 6, '0');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 2.3. generate_breakdown_id関数を追加（見積内訳のIDを生成）
CREATE OR REPLACE FUNCTION generate_breakdown_id()
RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  counter INTEGER;
  new_id TEXT;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 今日の最大カウンターを取得
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(breakdown_id FROM 'BRK-[0-9]{8}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM estimate_breakdown
  WHERE breakdown_id LIKE 'BRK-' || today_str || '-%';

  new_id := 'BRK-' || today_str || '-' || LPAD(counter::TEXT, 6, '0');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. completed_urlsテーブルのRLSポリシー追加
-- ========================================

ALTER TABLE completed_urls ENABLE ROW LEVEL SECURITY;

-- ポリシー：案件にアクセス可能なユーザーは完成品URLも閲覧可能
CREATE POLICY "Users can view completed urls of accessible projects"
  ON completed_urls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN users u ON u.auth_user_id = auth.uid()
      WHERE p.id = completed_urls.project_id
      AND (
        u.id = p.created_by
        OR u.id = p.main_editor
        OR u.id = ANY(p.sub_editors)
        OR u.id = p.director
        OR u.role IN ('leader', 'executive')
      )
    )
  );

-- ポリシー：案件作成者は完成品URLを追加・更新・削除可能
CREATE POLICY "Project creators can manage completed urls"
  ON completed_urls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN users u ON u.auth_user_id = auth.uid()
      WHERE p.id = completed_urls.project_id
      AND u.id = p.created_by
    )
  );
