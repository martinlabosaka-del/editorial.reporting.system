-- ========================================
-- 外部ディレクターを登録できるようにする
-- ========================================
--
-- 【背景】
-- ディレクターが社外の人（外部）である案件があるが、
-- projects.director は users(id) への外部キーかつ NOT NULL のため、
-- 社内ユーザーからしか選べなかった。
--
-- 【方針】
-- 「外部」を users に架空のユーザーとして登録する方法も取れるが、
-- ユーザー管理画面や編集者の集計に実在しない人物が混ざるため採らない。
-- 案件側にフラグを持たせ、外部の場合は director を空にする。
--
-- 【カラムの使い分け】
--   director               … 社内ディレクターのUUID。外部の場合は NULL
--   is_external_director   … 外部ディレクターかどうか
--   external_director_name … 外部ディレクターの氏名。任意入力なので NULL もありうる
-- ========================================

-- 外部の場合は director を空にするため、NOT NULL を外す
ALTER TABLE projects
  ALTER COLUMN director DROP NOT NULL;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_external_director BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS external_director_name TEXT;

COMMENT ON COLUMN projects.director IS
  '社内ディレクターのユーザーUUID。外部ディレクターの場合はNULL。';

COMMENT ON COLUMN projects.is_external_director IS
  '外部ディレクターかどうか。trueのときdirectorはNULLになる。';

COMMENT ON COLUMN projects.external_director_name IS
  '外部ディレクターの氏名。任意入力のため未入力（NULL）もありうる。';


-- ========================================
-- 適用後の確認用クエリ（手動で実行してください）
-- ========================================

-- (1) カラムが追加され、director が NULL 許可になったことを確認
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'projects'
--   AND column_name IN ('director', 'is_external_director', 'external_director_name');

-- (2) 既存の案件はすべて is_external_director = false（社内ディレクター）になる。
--     過去分を外部に切り替えたい場合のみ、案件を指定して個別に更新する。
--
-- UPDATE projects
-- SET director = NULL,
--     is_external_director = true,
--     external_director_name = '〇〇制作 田中'
-- WHERE project_id = 'PRJ-20260818-001';
