-- ========================================
-- 見積の合計金額（編集費以外を含む）を追加
-- ========================================
--
-- 【背景】
-- 既存の projects.estimate_total は「編集費内訳の自動合計」であり、
-- estimate_breakdown の amount を合算した値が保存される
-- （js/api.js の saveProject / updateProject で算出）。
-- 画面上も「編集費合計金額」と表示している。
--
-- 一方、実際の見積書には編集費以外の費用（撮影費・機材費・諸経費など）も
-- 含まれるため、見積書全体の合計を別枠で持てるようにする。
--
-- 【カラムの使い分け】
--   estimate_total       … 編集費のみの合計。内訳から自動計算（手入力しない）
--   estimate_grand_total … 見積書全体の合計。手入力する
-- ========================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS estimate_grand_total NUMERIC(12, 2);

COMMENT ON COLUMN projects.estimate_grand_total IS
  '見積合計金額（編集費以外の費用を含む見積書全体の合計）。手入力。';

COMMENT ON COLUMN projects.estimate_total IS
  '編集費合計金額（estimate_breakdownの自動合計）。手入力しない。';


-- ========================================
-- 適用後の確認用クエリ（手動で実行してください）
-- ========================================

-- (1) カラムが追加されたことを確認
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'projects'
--   AND column_name IN ('estimate_total', 'estimate_grand_total');

-- (2) 既存の案件は NULL になる（未入力扱い）。
--     過去分に編集費合計をそのまま入れておきたい場合のみ、下記を実行する。
--     ※ 編集費以外の費用が含まれていない値が入るため、
--        本来の見積合計とは一致しない点に注意。実行は任意。
--
-- UPDATE projects
-- SET estimate_grand_total = estimate_total
-- WHERE estimate_grand_total IS NULL
--   AND estimate_total IS NOT NULL;
