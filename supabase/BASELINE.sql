-- ========================================
-- 【一度きり】マイグレーション台帳のベースライン登録
-- ========================================
--
-- これは通常のマイグレーションではありません。
-- 自動適用（GitHub Actions）を始める前に、**手作業で1回だけ**
-- Supabase の SQL Editor で実行してください。
-- migrations/ には置いていないので、CI から流れることはありません。
--
-- 【なぜ必要か】
-- Supabase CLI は「どのSQLを適用済みか」を
-- supabase_migrations.schema_migrations テーブルで管理します。
-- これまで全て SQL Editor で手動実行してきたため、このテーブルには
-- 何も記録されていません。
--
-- その状態で `supabase db push` を走らせると、CLI は
-- 「1本も適用されていない」と判断して migrations/ の中身を
-- 最初から全部流そうとします。CREATE TABLE が衝突して失敗するか、
-- 最悪の場合データが壊れます。
--
-- そこで、既に手動適用済みの30本を「適用済み」として先に登録します。
-- これ以降、CLI は 20260812102858 より新しいものだけを流します。
--
-- 【実行前の確認】
-- STEP 1 を先に実行してください。
-- 台帳テーブルが「無い」または「0件」であれば、そのまま STEP 2 に進めます。
-- 既に何か記録されている場合は、ベースライン済みか CLI が使われた形跡です。
-- その場合は STEP 2 を実行せず、状況を確認してください。
-- ========================================


-- ========================================
-- STEP 1. 現状確認（先にこれだけ実行）
-- ========================================
-- 期待値: NULL（台帳テーブルがまだ無い＝これまで手動運用だった証拠）
--
-- ※ いきなり SELECT COUNT(*) を書くとテーブルが無いときにエラーになり、
--    「正常な未作成」なのか「本当の失敗」なのか区別できません。
--    to_regclass はテーブルが無ければ NULL を返すだけなので安全です。
--
-- SELECT to_regclass('supabase_migrations.schema_migrations') AS 台帳テーブル;
--
-- ↑ が NULL 以外だった場合のみ、続けて件数を確認してください:
--
-- SELECT COUNT(*) AS 既存の記録件数
-- FROM supabase_migrations.schema_migrations;


-- ========================================
-- STEP 2. ベースライン登録
-- ========================================

CREATE SCHEMA IF NOT EXISTS supabase_migrations;

-- CLI が作るものと同じ形にしておく。
-- 既にテーブルがある場合に備えて、列は個別に足す。
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY
);

ALTER TABLE supabase_migrations.schema_migrations
  ADD COLUMN IF NOT EXISTS statements TEXT[];

ALTER TABLE supabase_migrations.schema_migrations
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 適用済みとして記録する30本。
-- migrations/ のファイル名から機械的に生成したもので、
-- version = ファイル名の先頭14桁、name = それ以降。
--
-- statements は NULL のままにする。
-- CLI は version の有無だけを見て未適用かどうかを判断するため、
-- 中身の記録は不要（実際のSQLはリポジトリ側にある）。
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20260106120100', '01_schema'),
  ('20260106120200', '02_rls_policies'),
  ('20260106120300', '03_functions'),
  ('20260106120400', '04_storage_setup'),
  ('20260106120500', '05_initial_data'),
  ('20260106120600', '06_fix_estimate_breakdown'),
  ('20260106120700', '06_fix_estimate_breakdown_v2'),
  ('20260106120800', '07_add_missing_functions'),
  ('20260106120900', '08_add_main_editor_message'),
  ('20260106121000', '09_add_estimate_and_delivery_columns'),
  ('20260106121100', '10_storage_setup'),
  ('20260106121200', '11_add_admin_flag'),
  ('20260106121300', '12_add_editor_flag'),
  ('20260106121400', '13_fix_edit_time_references'),
  ('20260106121500', '14_fix_estimate_breakdown_column'),
  ('20260106121700', '004_fix_edit_history_structure'),
  ('20260106121800', '004_rename_edit_item_to_estimate_item'),
  ('20260106121900', '015_add_leader_comment'),
  ('20260106122000', '016_create_user_registration_function'),
  ('20260108120000', '018_add_editor_admin_flags_to_registration'),
  ('20260212113851', '16_add_affiliations_teams'),
  ('20260213101030', '17_add_project_milestones'),
  ('20260213115234', '18_add_milestone_types'),
  ('20260213120921', '19_add_milestone_confirmed_by'),
  ('20260213164333', '20_add_milestone_memo'),
  ('20260811104902', '019_secure_user_registration'),
  ('20260811113908', '020_fix_rls_policies'),
  ('20260811120052', '021_admin_reset_password'),
  ('20260811152935', '022_add_estimate_grand_total'),
  ('20260812102858', '023_recalculate_target_hours')
ON CONFLICT (version) DO NOTHING;


-- ========================================
-- STEP 3. 適用後の確認
-- ========================================
-- 30件になっていれば成功です。
--
-- SELECT COUNT(*) AS 登録件数 FROM supabase_migrations.schema_migrations;
--
-- SELECT version, name
-- FROM supabase_migrations.schema_migrations
-- ORDER BY version;
