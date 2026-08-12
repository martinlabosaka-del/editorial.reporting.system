-- ========================================
-- projects.target_hours に単位の説明を付ける
-- ========================================
--
-- 【このマイグレーションの位置づけ】
-- 自動適用パイプラインの疎通確認を兼ねた1本目です。
-- COMMENT ON はメタデータを書き換えるだけで、テーブル定義もデータも
-- 一切変更しません。失敗しても影響が無く、何度流しても同じ結果になります。
--
-- 【なぜ必要か】
-- カラム名は target_hours ですが、**中身は分単位**です。
-- 01_schema.sql には `-- 分単位` と書いてありますが、これはSQLファイル上の
-- コメントであってDBには残りません。SQL Editor や Table Editor から
-- 見ている人には、時間なのか分なのか判断する手がかりがありません。
--
-- 実際、見積内訳から目標時間を再計算する 023 を書くまで、
-- この単位の取り違えが混乱の元になっていました。
-- DB側にコメントを残しておけば、次に触る人が同じ迷い方をしません。
-- ========================================

COMMENT ON COLUMN projects.target_hours IS
  '編集目標時間。カラム名は hours だが単位は「分」。'
  '見積内訳の各行について ROUND(金額 ÷ edit_items.hourly_rate × 60) を合計した値。'
  '案件の新規登録時と更新時に js/api.js の calculateEstimateTotals() が算出する。';


-- ========================================
-- 確認（手動で実行してください）
-- ========================================
-- SELECT col_description('projects'::regclass, ordinal_position) AS 説明
-- FROM information_schema.columns
-- WHERE table_name = 'projects' AND column_name = 'target_hours';
