-- ========================================
-- Supabase Storage 設定
-- ========================================

-- このSQLは参考用です。実際のストレージバケット作成とポリシー設定は
-- Supabase Studioから行うか、以下のSQLを実行してください。

-- ========================================
-- 1. ストレージバケットの作成
-- ========================================

-- estimate-pdfs バケットを作成（見積PDF保存用）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'estimate-pdfs',
  'estimate-pdfs',
  false,  -- プライベートバケット
  10485760,  -- 10MB
  ARRAY['application/pdf']
);

-- ========================================
-- 2. ストレージポリシーの設定
-- ========================================

-- ポリシー：認証済みユーザーはPDFをアップロード可能
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'estimate-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー：自分がアップロードしたPDFは閲覧可能
CREATE POLICY "Users can view their own PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'estimate-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー：案件関係者はPDFを閲覧可能
CREATE POLICY "Project members can view PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'estimate-pdfs'
  AND EXISTS (
    SELECT 1 FROM projects p
    JOIN users u ON u.auth_user_id = auth.uid()
    WHERE p.estimate_pdf_url LIKE '%' || name || '%'
    AND (
      u.id = p.created_by
      OR u.id = p.main_editor
      OR u.id = ANY(p.sub_editors)
      OR u.id = p.director
      OR u.role IN ('leader', 'executive')
    )
  )
);

-- ポリシー：leader/executiveは全PDFを閲覧可能
CREATE POLICY "Leaders and executives can view all PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'estimate-pdfs'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND role IN ('leader', 'executive')
  )
);

-- ポリシー：自分がアップロードしたPDFは削除可能
CREATE POLICY "Users can delete their own PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'estimate-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー：自分がアップロードしたPDFは更新可能（再アップロード）
CREATE POLICY "Users can update their own PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'estimate-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- 注意事項
-- ========================================

-- ファイル命名規則:
-- {auth_user_id}/{project_id}_{client_name}_見積書.pdf
--
-- 例:
-- a1b2c3d4-e5f6-7890-abcd-ef1234567890/PRJ-20250103-001_クライアント名_見積書.pdf
--
-- この構造により:
-- 1. ユーザーごとにフォルダ分け
-- 2. プロジェクトIDで一意性を保証
-- 3. RLSポリシーで適切なアクセス制御
