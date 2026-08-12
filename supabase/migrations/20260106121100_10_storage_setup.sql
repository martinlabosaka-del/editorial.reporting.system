-- ========================================
-- Supabase Storage設定（見積PDFバケット）
-- ========================================

-- estimatesバケットを作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('estimates', 'estimates', false)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- RLSポリシー設定
-- ========================================

-- 認証済みユーザーはアップロード可能
CREATE POLICY "Authenticated users can upload estimates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'estimates');

-- 認証済みユーザーは閲覧可能
CREATE POLICY "Authenticated users can view estimates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'estimates');

-- 認証済みユーザーは更新可能
CREATE POLICY "Authenticated users can update estimates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'estimates');

-- 認証済みユーザーは削除可能
CREATE POLICY "Authenticated users can delete estimates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'estimates');
