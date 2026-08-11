-- ========================================
-- RLSポリシーの再設計（017の暫定対処を置き換える）
-- ========================================
--
-- 【背景】
-- 017_fix_rls_policies.sql が projects / edit_history / estimate_breakdown /
-- completed_urls に USING (true) WITH CHECK (true) のポリシーを追加していた。
-- PostgreSQL の PERMISSIVE ポリシーは OR で結合されるため、
-- 02_rls_policies.sql の細かい制限は事実上すべて無効化されていた。
--
-- 017 がこうなったのは、02 のポリシーがアプリの実動作と噛み合っていなかったため。
--   - 案件のUPDATEを created_by にしか許可していないが、実際に編集するのは main_editor
--   - completed_urls にポリシーが1つも無く、RLS有効なら全拒否
--   - projects に DELETE ポリシーが無く、案件削除が無言で失敗していた
-- そのため 017 を消すだけでは動かなくなる。本ファイルで作り直す。
--
-- 【本ファイルで直すもの】
-- (A) users の UPDATE ポリシーが実質 true（権限昇格）
--     現状: USING ((auth_user_id = auth.uid()) OR true)
--     → ログイン済みなら誰でも任意のユーザーの role / is_admin を書き換えられる
-- (B) 未使用の SECURITY DEFINER 関数に anon の EXECUTE が付いている
--     approve_project_by_executive / approve_project_by_leader /
--     reject_project_by_leader / submit_project / get_dashboard_data
--     → anon key は公開されているため、誰でも任意の案件を承認・差戻し・申請できる
-- (C) 017 の USING(true) ポリシー群
-- (D) projects の DELETE ポリシー欠落（案件削除が効いていない）
-- (E) notifications の INSERT が anon にも開いている
--
-- 【方針】
-- 「誰が触れるか」だけをRLSで制御する。
-- ステータス遷移の制御（下書きのみ編集可、など）はフロントエンド側のままとする。
--
-- 【適用前に必ず】
-- 1. supabase/check_rls_policies.sql で現状を控えておくこと。
-- 2. 下の事前チェックで「有効な管理者が1人以上いる」ことを確認すること。
--    本ファイル適用後、usersテーブルを更新できるのは is_admin のユーザーだけになる。
--    該当者が0人だと、誰もユーザー管理ができなくなる。
--
--    SELECT user_id, name, role, is_admin, is_active
--    FROM users
--    WHERE COALESCE(is_admin, false) = true
--      AND COALESCE(is_active, false) = true;
--
--    → 0件だった場合は、先に管理者を立ててから本ファイルを適用すること
--      （SQL Editor は postgres ロールで動くためRLSに関係なく更新できる）:
--      UPDATE users SET is_admin = true WHERE user_id = '<管理者にするユーザーID>';
--
-- 巻き戻しが必要な場合は末尾の「ロールバック」を参照。
-- ========================================


-- ========================================
-- 0. 補助関数
-- ========================================
-- users テーブルのポリシー内で users を参照すると
-- 「infinite recursion detected in policy for relation users」になる。
-- SECURITY DEFINER 関数にすることで RLS を迂回し、再帰を避ける。
-- 各行ごとにサブクエリを実行するより高速でもある。

CREATE OR REPLACE FUNCTION public.app_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM users
  WHERE auth_user_id = auth.uid()
    AND COALESCE(is_active, false) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM users
  WHERE auth_user_id = auth.uid()
    AND COALESCE(is_active, false) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin
     FROM users
     WHERE auth_user_id = auth.uid()
       AND COALESCE(is_active, false) = true
     LIMIT 1),
    false
  );
$$;

-- 案件を閲覧できるか（関係者 or リーダー/役員）
CREATE OR REPLACE FUNCTION public.app_can_view_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = p_project_id
      AND (
        public.app_current_user_role() IN ('leader', 'executive')
        OR public.app_current_user_id() = p.created_by
        OR public.app_current_user_id() = p.main_editor
        OR public.app_current_user_id() = p.director
        OR public.app_current_user_id() = ANY(p.sub_editors)
      )
  );
$$;

-- 案件を編集できるか（作成者・メイン編集者 or リーダー/役員）
-- サブ編集者は編集時間の登録のみで、案件本体は編集しないため含めない。
CREATE OR REPLACE FUNCTION public.app_can_edit_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = p_project_id
      AND (
        public.app_current_user_role() IN ('leader', 'executive')
        OR public.app_current_user_id() = p.created_by
        OR public.app_current_user_id() = p.main_editor
      )
  );
$$;

-- 補助関数自体は anon に公開しない
REVOKE ALL ON FUNCTION public.app_current_user_id()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_current_user_role()          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_current_user_is_admin()      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_view_project(UUID)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_edit_project(UUID)       FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.app_current_user_id()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_user_role()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_user_is_admin()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_view_project(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_edit_project(UUID)    TO authenticated;


-- ========================================
-- 1. 【最優先】anonから呼べる SECURITY DEFINER 関数を削除
-- ========================================
-- これらは 03_functions.sql / 07_add_missing_functions.sql で作られたもので、
-- SECURITY DEFINER のため RLS を迂回する。さらに anon に EXECUTE が付いている。
-- 承認者IDを引数で受け取るだけで呼び出し元の検証が無いため、
-- 公開されている anon key があれば誰でも任意の案件を承認・差戻し・申請できる。
--
-- いずれも現在のフロントエンドからは呼ばれていない（js/api.js の .rpc() は
-- generate_* と register_new_user のみ）ため、削除して問題ない。

DROP FUNCTION IF EXISTS public.approve_project_by_executive(UUID, UUID);
DROP FUNCTION IF EXISTS public.approve_project_by_leader(UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS public.reject_project_by_leader(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.submit_project(UUID, UUID);

-- get_dashboard_data は引数の型が2種類存在しうるため両方を対象にする
DROP FUNCTION IF EXISTS public.get_dashboard_data(TEXT);
DROP FUNCTION IF EXISTS public.get_dashboard_data(UUID);


-- ========================================
-- 2. 【最優先】users テーブル
-- ========================================
-- 現状の UPDATE ポリシーは USING ((auth_user_id = auth.uid()) OR true) で、
-- OR true により全ユーザーが全ユーザーを更新できる状態。
-- 自分の role を 'executive'、is_admin を true に書き換えられる。

DROP POLICY IF EXISTS "Leaders and executives can update users" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- ユーザー情報を更新できるのは管理者(is_admin)のみ。
-- （js/api.js の updateUser / deleteUser もクライアント側で is_admin を見ている）
CREATE POLICY "users_update_admin_only"
  ON users FOR UPDATE
  TO authenticated
  USING (public.app_current_user_is_admin())
  WITH CHECK (public.app_current_user_is_admin());

-- SELECT は現状維持（各種プルダウンで全ユーザーの名前が必要なため）。
-- INSERT ポリシーは作らない。ユーザー登録は SECURITY DEFINER の
-- register_new_user 経由のみとする（019で管理者チェック済み）。
-- DELETE ポリシーも作らない。退職者は is_active = false の論理削除で扱う。


-- ========================================
-- 3. projects テーブル
-- ========================================

-- 017 が追加した素通しポリシーを削除
DROP POLICY IF EXISTS "projects_update_policy" ON projects;

-- 02 の UPDATE ポリシー3種も、下の1本にまとめるため削除
DROP POLICY IF EXISTS "Users can update their own projects"   ON projects;
DROP POLICY IF EXISTS "Leaders can update assigned projects"  ON projects;
DROP POLICY IF EXISTS "Executives can update all projects"    ON projects;

-- 更新できるのは 作成者 / メイン編集者 / リーダー / 役員
--   - 02 は created_by しか許可していなかったが、実際に編集するのは main_editor
--   - 承認は「申請先の上長」に限らずリーダー・役員なら誰でも行える
--     （js/approval.js の canApprove と同じ条件）
CREATE POLICY "projects_update"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    public.app_current_user_role() IN ('leader', 'executive')
    OR public.app_current_user_id() = created_by
    OR public.app_current_user_id() = main_editor
  )
  WITH CHECK (
    public.app_current_user_role() IN ('leader', 'executive')
    OR public.app_current_user_id() = created_by
    OR public.app_current_user_id() = main_editor
  );

-- 【新規】DELETE ポリシー
-- これまで projects に DELETE ポリシーが1つも無かったため、
-- 案件削除は「成功」と表示されるだけで実際には削除されていなかった。
-- （PostgREST はRLSで0件になってもエラーを返さない）
CREATE POLICY "projects_delete"
  ON projects FOR DELETE
  TO authenticated
  USING (
    public.app_current_user_is_admin()
    OR public.app_current_user_id() = created_by
    OR public.app_current_user_id() = main_editor
  );

-- SELECT / INSERT は 02 のものをそのまま使う
--   "Users can view their own projects"（関係者）
--   "Leaders and executives can view all projects"
--   "Authenticated users can insert projects"（created_by = 自分）


-- ========================================
-- 4. 案件の子テーブル
-- ========================================
-- estimate_breakdown / completed_urls / edit_history / project_milestones は
-- 親案件の権限に従わせる。
-- アプリは更新時に「全削除 → 再INSERT」を行うため、
-- 編集できる人には INSERT / UPDATE / DELETE をまとめて許可する。

-- ---------- estimate_breakdown ----------
DROP POLICY IF EXISTS "estimate_breakdown_insert_policy"            ON estimate_breakdown;
DROP POLICY IF EXISTS "estimate_breakdown_update_policy"            ON estimate_breakdown;
DROP POLICY IF EXISTS "estimate_breakdown_delete_policy"            ON estimate_breakdown;
DROP POLICY IF EXISTS "Project creators can manage estimate breakdown" ON estimate_breakdown;
DROP POLICY IF EXISTS "Users can view estimate breakdown of accessible projects" ON estimate_breakdown;

CREATE POLICY "estimate_breakdown_select"
  ON estimate_breakdown FOR SELECT
  TO authenticated
  USING (public.app_can_view_project(project_id));

CREATE POLICY "estimate_breakdown_write"
  ON estimate_breakdown FOR ALL
  TO authenticated
  USING (public.app_can_edit_project(project_id))
  WITH CHECK (public.app_can_edit_project(project_id));

-- ---------- completed_urls ----------
DROP POLICY IF EXISTS "completed_urls_insert_policy"             ON completed_urls;
DROP POLICY IF EXISTS "completed_urls_update_policy"             ON completed_urls;
DROP POLICY IF EXISTS "completed_urls_delete_policy"             ON completed_urls;
DROP POLICY IF EXISTS "Project creators can manage completed urls" ON completed_urls;
DROP POLICY IF EXISTS "Users can view completed urls of accessible projects" ON completed_urls;

CREATE POLICY "completed_urls_select"
  ON completed_urls FOR SELECT
  TO authenticated
  USING (public.app_can_view_project(project_id));

CREATE POLICY "completed_urls_write"
  ON completed_urls FOR ALL
  TO authenticated
  USING (public.app_can_edit_project(project_id))
  WITH CHECK (public.app_can_edit_project(project_id));

-- ---------- project_milestones ----------
DROP POLICY IF EXISTS "project_milestones_all_authenticated"    ON project_milestones;
DROP POLICY IF EXISTS "project_milestones_select_authenticated" ON project_milestones;

CREATE POLICY "project_milestones_select"
  ON project_milestones FOR SELECT
  TO authenticated
  USING (public.app_can_view_project(project_id));

CREATE POLICY "project_milestones_write"
  ON project_milestones FOR ALL
  TO authenticated
  USING (public.app_can_edit_project(project_id))
  WITH CHECK (public.app_can_edit_project(project_id));

-- ---------- edit_history ----------
-- 編集時間はサブ編集者も登録するため、他とは条件が異なる。
--   閲覧: 案件関係者（サブ編集者含む）＋リーダー/役員
--   追加: 本人分のみ（editor = 自分）。案件を閲覧できることも条件にする
--   更新/削除: 案件を編集できる人（案件更新時の洗い替え・案件削除で必要）
DROP POLICY IF EXISTS "edit_history_insert_policy"                ON edit_history;
DROP POLICY IF EXISTS "edit_history_update_policy"                ON edit_history;
DROP POLICY IF EXISTS "edit_history_delete_policy"                ON edit_history;
DROP POLICY IF EXISTS "Authenticated users can insert edit history" ON edit_history;
DROP POLICY IF EXISTS "Users can view their own edit history"     ON edit_history;
DROP POLICY IF EXISTS "Project members can view edit history"     ON edit_history;
DROP POLICY IF EXISTS "Leaders and executives can view all edit history" ON edit_history;

CREATE POLICY "edit_history_select"
  ON edit_history FOR SELECT
  TO authenticated
  USING (
    editor = public.app_current_user_id()
    OR public.app_can_view_project(project_id)
  );

CREATE POLICY "edit_history_insert_own"
  ON edit_history FOR INSERT
  TO authenticated
  WITH CHECK (
    editor = public.app_current_user_id()
    AND public.app_can_view_project(project_id)
  );

CREATE POLICY "edit_history_update"
  ON edit_history FOR UPDATE
  TO authenticated
  USING (public.app_can_edit_project(project_id))
  WITH CHECK (public.app_can_edit_project(project_id));

CREATE POLICY "edit_history_delete"
  ON edit_history FOR DELETE
  TO authenticated
  USING (public.app_can_edit_project(project_id));


-- ========================================
-- 5. マスタ系（affiliations / teams / milestone_types）
-- ========================================
-- いずれも ALL true / SELECT true で開いている。
-- 所属・チームは管理画面からのみ操作するため管理者限定にする。
-- 工程タイプは案件編集画面から編集者が追加するため、追加は認証済みユーザーに許可する。

-- ---------- affiliations ----------
DROP POLICY IF EXISTS "affiliations_all_authenticated"    ON affiliations;
DROP POLICY IF EXISTS "affiliations_select_authenticated" ON affiliations;

CREATE POLICY "affiliations_select"
  ON affiliations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "affiliations_write_admin"
  ON affiliations FOR ALL
  TO authenticated
  USING (public.app_current_user_is_admin())
  WITH CHECK (public.app_current_user_is_admin());

-- ---------- teams ----------
DROP POLICY IF EXISTS "teams_all_authenticated"    ON teams;
DROP POLICY IF EXISTS "teams_select_authenticated" ON teams;

CREATE POLICY "teams_select"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teams_write_admin"
  ON teams FOR ALL
  TO authenticated
  USING (public.app_current_user_is_admin())
  WITH CHECK (public.app_current_user_is_admin());

-- ---------- milestone_types ----------
DROP POLICY IF EXISTS "milestone_types_all_authenticated"    ON milestone_types;
DROP POLICY IF EXISTS "milestone_types_select_authenticated" ON milestone_types;

CREATE POLICY "milestone_types_select"
  ON milestone_types FOR SELECT
  TO authenticated
  USING (true);

-- 追加は案件編集画面（js/project_edit.js の addMilestoneType）から行うため認証済みに許可
CREATE POLICY "milestone_types_insert"
  ON milestone_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 変更・削除は管理者のみ
CREATE POLICY "milestone_types_update_admin"
  ON milestone_types FOR UPDATE
  TO authenticated
  USING (public.app_current_user_is_admin())
  WITH CHECK (public.app_current_user_is_admin());

CREATE POLICY "milestone_types_delete_admin"
  ON milestone_types FOR DELETE
  TO authenticated
  USING (public.app_current_user_is_admin());


-- ========================================
-- 6. notifications テーブル
-- ========================================
-- "System can create notifications" は roles = {public} かつ WITH CHECK (true) のため、
-- 未ログイン(anon)でも通知レコードを作れる状態になっている。
-- 通知を作るのは SECURITY DEFINER 関数（RLS迂回）だけなので、
-- クライアントからの INSERT は認証済みに限定する。

DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "notifications_insert_authenticated"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT / UPDATE（自分宛のみ）は 02 のものをそのまま使う


-- ========================================
-- 適用後の確認（手動で実行してください）
-- ========================================

-- (1) 素通しポリシーが残っていないか
--     projects / edit_history / estimate_breakdown / completed_urls /
--     users / project_milestones が消えていればOK。
--     残ってよいのは以下の5件（いずれも意図的）:
--       affiliations_select, teams_select, milestone_types_select … マスタの閲覧
--       milestone_types_insert                                    … 編集者が工程を追加
--       notifications_insert_authenticated                        … 通知の作成
--
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND permissive = 'PERMISSIVE'
--   AND (
--     (cmd IN ('SELECT', 'DELETE') AND qual IN ('true', '(true)'))
--     OR (cmd = 'INSERT' AND with_check IN ('true', '(true)'))
--     OR (cmd IN ('UPDATE', 'ALL')
--         AND (qual IN ('true', '(true)') OR with_check IN ('true', '(true)')))
--   )
-- ORDER BY tablename, cmd;

-- (2) anon から呼べる SECURITY DEFINER 関数が register_new_user 以外に無いか
--     → app_* 関数と register_new_user が「(なし)」ならOK
--
-- SELECT p.proname,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        COALESCE((SELECT STRING_AGG(DISTINCT rp.grantee, ', ')
--                  FROM information_schema.routine_privileges rp
--                  WHERE rp.routine_schema = 'public'
--                    AND rp.routine_name = p.proname
--                    AND rp.grantee IN ('anon', 'PUBLIC')), '(なし)') AS anon_execute
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.prosecdef = true
-- ORDER BY p.proname;

-- (3) users を書き換えられないことの確認
--     管理者以外でログインした状態（アプリ経由）で自分の role を変えようとして
--     0件更新になればOK。SQL Editor は postgres ロールのため素通りするので、
--     必ずアプリ（ブラウザ）側で確認すること。


-- ========================================
-- ロールバック
-- ========================================
-- 本ファイルで作ったポリシーを消して 017 相当の状態に戻す場合。
-- ※ あくまで緊急用。素通し状態に戻ることに注意。
--
-- DROP POLICY IF EXISTS "projects_update"            ON projects;
-- DROP POLICY IF EXISTS "projects_delete"            ON projects;
-- DROP POLICY IF EXISTS "users_update_admin_only"    ON users;
-- DROP POLICY IF EXISTS "estimate_breakdown_select"  ON estimate_breakdown;
-- DROP POLICY IF EXISTS "estimate_breakdown_write"   ON estimate_breakdown;
-- DROP POLICY IF EXISTS "completed_urls_select"      ON completed_urls;
-- DROP POLICY IF EXISTS "completed_urls_write"       ON completed_urls;
-- DROP POLICY IF EXISTS "project_milestones_select"  ON project_milestones;
-- DROP POLICY IF EXISTS "project_milestones_write"   ON project_milestones;
-- DROP POLICY IF EXISTS "edit_history_select"        ON edit_history;
-- DROP POLICY IF EXISTS "edit_history_insert_own"    ON edit_history;
-- DROP POLICY IF EXISTS "edit_history_update"        ON edit_history;
-- DROP POLICY IF EXISTS "edit_history_delete"        ON edit_history;
--
-- CREATE POLICY "projects_update_policy" ON projects FOR UPDATE TO authenticated
--   USING (true) WITH CHECK (true);
-- CREATE POLICY "users_update_rollback" ON users FOR UPDATE TO authenticated
--   USING (true) WITH CHECK (true);
-- -- 子テーブルも同様に FOR ALL USING(true) WITH CHECK(true) を作れば元に戻る
