-- ========================================
-- RLSポリシーの修正
-- estimate_breakdown, edit_history, completed_urls テーブルへのINSERT権限を付与
-- ========================================

-- ========================================
-- 1. estimate_breakdown テーブル
-- ========================================

-- 既存のINSERTポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "estimate_breakdown_insert_policy" ON estimate_breakdown;

-- 新しいINSERTポリシーを作成
-- 認証済みユーザーは見積内訳を追加可能
CREATE POLICY "estimate_breakdown_insert_policy"
ON estimate_breakdown
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATEポリシーも確認
DROP POLICY IF EXISTS "estimate_breakdown_update_policy" ON estimate_breakdown;

CREATE POLICY "estimate_breakdown_update_policy"
ON estimate_breakdown
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETEポリシーも確認
DROP POLICY IF EXISTS "estimate_breakdown_delete_policy" ON estimate_breakdown;

CREATE POLICY "estimate_breakdown_delete_policy"
ON estimate_breakdown
FOR DELETE
TO authenticated
USING (true);

-- ========================================
-- 2. edit_history テーブル
-- ========================================

-- 既存のINSERTポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "edit_history_insert_policy" ON edit_history;

-- 新しいINSERTポリシーを作成
-- 認証済みユーザーは編集時間を追加可能
CREATE POLICY "edit_history_insert_policy"
ON edit_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATEポリシーも確認
DROP POLICY IF EXISTS "edit_history_update_policy" ON edit_history;

CREATE POLICY "edit_history_update_policy"
ON edit_history
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETEポリシーも確認
DROP POLICY IF EXISTS "edit_history_delete_policy" ON edit_history;

CREATE POLICY "edit_history_delete_policy"
ON edit_history
FOR DELETE
TO authenticated
USING (true);

-- ========================================
-- 3. completed_urls テーブル
-- ========================================

-- 既存のINSERTポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "completed_urls_insert_policy" ON completed_urls;

-- 新しいINSERTポリシーを作成
-- 認証済みユーザーは完成品URLを追加可能
CREATE POLICY "completed_urls_insert_policy"
ON completed_urls
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATEポリシーも確認
DROP POLICY IF EXISTS "completed_urls_update_policy" ON completed_urls;

CREATE POLICY "completed_urls_update_policy"
ON completed_urls
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETEポリシーも確認
DROP POLICY IF EXISTS "completed_urls_delete_policy" ON completed_urls;

CREATE POLICY "completed_urls_delete_policy"
ON completed_urls
FOR DELETE
TO authenticated
USING (true);

-- ========================================
-- 4. projects テーブルのUPDATEポリシーも確認
-- ========================================

-- 既存のUPDATEポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "projects_update_policy" ON projects;

-- 新しいUPDATEポリシーを作成
-- 認証済みユーザーはプロジェクトを更新可能
CREATE POLICY "projects_update_policy"
ON projects
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
