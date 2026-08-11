-- ========================================
-- Row Level Security (RLS) ポリシー設定【現行版】
-- ========================================
--
-- このファイルは「現在のDBにあるべきポリシーの全量」です。
-- 何度実行しても同じ状態になります（DROP IF EXISTS → CREATE）。
--
-- 【経緯】
-- 旧版のこのファイルはアプリの実動作と噛み合っておらず
--   - 案件のUPDATEを created_by にしか許可していない（実際に編集するのは main_editor）
--   - completed_urls にポリシーが1つも無い
--   - projects に DELETE ポリシーが無い
--   - users のポリシー内で users を参照しており無限再帰になる
-- そのため 017_fix_rls_policies.sql が USING (true) で全面的に開ける、という
-- 暫定対処が入っていました。
-- 020_fix_rls_policies.sql で全体を作り直したため、
-- このファイルもその結果に合わせて書き直しています（017は削除済み）。
--
-- 【適用順】
-- 新規構築 : 01_schema.sql → このファイル → 03以降
-- 既存DB   : 020適用済みなら必須ではない。ただし下記の差分があるため、
--            ファイルとDBを一致させたい場合は実行を推奨（何度実行しても安全）。
--
-- 【020適用済みのDBとの差分】
-- clients / genres / technologies / estimate_items / edit_items /
-- leader_evaluation / notifications / projects の一部ポリシーは、
-- DB上ではまだ旧来の書き方
--   EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN (...))
-- で残っています。このファイルではこれを app_current_user_role() 等に統一しました。
-- 判定結果はほぼ同じですが、補助関数は is_active = true を条件に含むため、
-- 「無効化されたユーザー」がこれらのテーブルを操作できなくなります（意図した締め）。
--
-- 【実行前の確認】
-- 補助関数は is_active が true のユーザーだけを対象にします。
-- is_active が NULL のレコードがあると、そのユーザーは何も操作できなくなります。
-- 下記が0件であることを確認してください（0件でなければ先に true を入れる）:
--   SELECT user_id, name, is_active FROM users WHERE is_active IS NULL;
--
-- 【方針】
-- 「誰が触れるか」だけをRLSで制御する。
-- ステータス遷移の制御（下書きのみ編集可、など）はフロントエンド側に置く。
-- ========================================


-- ========================================
-- 0. 補助関数
-- ========================================
-- users のポリシー内で users を参照すると
-- 「infinite recursion detected in policy for relation users」になる。
-- SECURITY DEFINER 関数にすることで RLS を迂回し、再帰を避ける。
-- 行ごとにサブクエリを実行するより高速でもある。
-- （020_fix_rls_policies.sql と同一内容。CREATE OR REPLACE なので重複実行して問題ない）

CREATE OR REPLACE FUNCTION public.app_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM users
  WHERE auth_user_id = auth.uid() AND COALESCE(is_active, false) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM users
  WHERE auth_user_id = auth.uid() AND COALESCE(is_active, false) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM users
     WHERE auth_user_id = auth.uid() AND COALESCE(is_active, false) = true
     LIMIT 1),
    false
  );
$$;

-- 案件を閲覧できるか（関係者 or リーダー/役員）
CREATE OR REPLACE FUNCTION public.app_can_view_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
      AND (
        public.app_current_user_role() IN ('leader', 'executive')
        OR public.app_current_user_id() = p.created_by
        OR public.app_current_user_id() = p.main_editor
      )
  );
$$;

REVOKE ALL ON FUNCTION public.app_current_user_id()       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_current_user_role()     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_current_user_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_view_project(UUID)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_edit_project(UUID)  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.app_current_user_id()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_user_role()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_view_project(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_edit_project(UUID)  TO authenticated;


-- ========================================
-- 1. users テーブル
-- ========================================
-- INSERT ポリシーは作らない。ユーザー登録は SECURITY DEFINER の
-- register_new_user 経由のみ（019で管理者チェック済み）。
-- DELETE ポリシーも作らない。退職者は is_active = false の論理削除で扱う。

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own data"          ON users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Leaders and executives can view all users" ON users;
DROP POLICY IF EXISTS "Leaders and executives can update users"   ON users;
DROP POLICY IF EXISTS "users_update_admin_only"                ON users;

CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id);

-- 各種プルダウン（編集者・上長の選択）で全ユーザーの名前が必要なため全件閲覧を許可
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- 更新できるのは管理者(is_admin)のみ
CREATE POLICY "users_update_admin_only"
  ON users FOR UPDATE
  TO authenticated
  USING (public.app_current_user_is_admin())
  WITH CHECK (public.app_current_user_is_admin());


-- ========================================
-- 2. clients テーブル
-- ========================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Non part-time users can insert clients"   ON clients;
DROP POLICY IF EXISTS "Non part-time users can update clients"   ON clients;

CREATE POLICY "All authenticated users can view clients"
  ON clients FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Non part-time users can insert clients"
  ON clients FOR INSERT
  WITH CHECK (public.app_current_user_role() IN ('staff', 'leader', 'executive'));

CREATE POLICY "Non part-time users can update clients"
  ON clients FOR UPDATE
  USING (public.app_current_user_role() IN ('staff', 'leader', 'executive'));


-- ========================================
-- 3. マスタ系（genres / technologies / estimate_items / edit_items）
-- ========================================
-- 閲覧は全員、管理はリーダー/役員。

ALTER TABLE genres          ENABLE ROW LEVEL SECURITY;
ALTER TABLE technologies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_items      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can view genres"                    ON genres;
DROP POLICY IF EXISTS "Leaders and executives can manage genres"     ON genres;
DROP POLICY IF EXISTS "All users can view technologies"              ON technologies;
DROP POLICY IF EXISTS "Leaders and executives can manage technologies" ON technologies;
DROP POLICY IF EXISTS "All users can view estimate items"            ON estimate_items;
DROP POLICY IF EXISTS "Leaders and executives can manage estimate items" ON estimate_items;
DROP POLICY IF EXISTS "All users can view edit items"                ON edit_items;
DROP POLICY IF EXISTS "Leaders and executives can manage edit items" ON edit_items;

CREATE POLICY "All users can view genres"
  ON genres FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leaders and executives can manage genres"
  ON genres FOR ALL
  USING (public.app_current_user_role() IN ('leader', 'executive'));

CREATE POLICY "All users can view technologies"
  ON technologies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leaders and executives can manage technologies"
  ON technologies FOR ALL
  USING (public.app_current_user_role() IN ('leader', 'executive'));

CREATE POLICY "All users can view estimate items"
  ON estimate_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leaders and executives can manage estimate items"
  ON estimate_items FOR ALL
  USING (public.app_current_user_role() IN ('leader', 'executive'));

CREATE POLICY "All users can view edit items"
  ON edit_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leaders and executives can manage edit items"
  ON edit_items FOR ALL
  USING (public.app_current_user_role() IN ('leader', 'executive'));


-- ========================================
-- 4. 所属 / チーム / 工程タイプ
-- ========================================

ALTER TABLE affiliations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams           ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliations_all_authenticated"    ON affiliations;
DROP POLICY IF EXISTS "affiliations_select_authenticated" ON affiliations;
DROP POLICY IF EXISTS "affiliations_select"               ON affiliations;
DROP POLICY IF EXISTS "affiliations_write_admin"          ON affiliations;

CREATE POLICY "affiliations_select"
  ON affiliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "affiliations_write_admin"
  ON affiliations FOR ALL TO authenticated
  USING (public.app_current_user_is_admin())
  WITH CHECK (public.app_current_user_is_admin());

DROP POLICY IF EXISTS "teams_all_authenticated"    ON teams;
DROP POLICY IF EXISTS "teams_select_authenticated" ON teams;
DROP POLICY IF EXISTS "teams_select"               ON teams;
DROP POLICY IF EXISTS "teams_write_admin"          ON teams;

CREATE POLICY "teams_select"
  ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_write_admin"
  ON teams FOR ALL TO authenticated
  USING (public.app_current_user_is_admin())
  WITH CHECK (public.app_current_user_is_admin());

DROP POLICY IF EXISTS "milestone_types_all_authenticated"    ON milestone_types;
DROP POLICY IF EXISTS "milestone_types_select_authenticated" ON milestone_types;
DROP POLICY IF EXISTS "milestone_types_select"               ON milestone_types;
DROP POLICY IF EXISTS "milestone_types_insert"               ON milestone_types;
DROP POLICY IF EXISTS "milestone_types_update_admin"         ON milestone_types;
DROP POLICY IF EXISTS "milestone_types_delete_admin"         ON milestone_types;

CREATE POLICY "milestone_types_select"
  ON milestone_types FOR SELECT TO authenticated USING (true);
-- 追加は案件編集画面（js/project_edit.js の addMilestoneType）から行うため認証済みに許可
CREATE POLICY "milestone_types_insert"
  ON milestone_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "milestone_types_update_admin"
  ON milestone_types FOR UPDATE TO authenticated
  USING (public.app_current_user_is_admin())
  WITH CHECK (public.app_current_user_is_admin());
CREATE POLICY "milestone_types_delete_admin"
  ON milestone_types FOR DELETE TO authenticated
  USING (public.app_current_user_is_admin());


-- ========================================
-- 5. projects テーブル
-- ========================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects"          ON projects;
DROP POLICY IF EXISTS "Leaders and executives can view all projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects"    ON projects;
DROP POLICY IF EXISTS "Users can update their own projects"        ON projects;
DROP POLICY IF EXISTS "Leaders can update assigned projects"       ON projects;
DROP POLICY IF EXISTS "Executives can update all projects"         ON projects;
DROP POLICY IF EXISTS "projects_update_policy"                     ON projects;
DROP POLICY IF EXISTS "projects_update"                            ON projects;
DROP POLICY IF EXISTS "projects_delete"                            ON projects;

-- 案件関係者は閲覧可能
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (
    public.app_current_user_id() = created_by
    OR public.app_current_user_id() = main_editor
    OR public.app_current_user_id() = director
    OR public.app_current_user_id() = ANY(sub_editors)
  );

CREATE POLICY "Leaders and executives can view all projects"
  ON projects FOR SELECT
  USING (public.app_current_user_role() IN ('leader', 'executive'));

-- 作成者は自分自身でなければならない
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (public.app_current_user_id() = created_by);

-- 更新できるのは 作成者 / メイン編集者 / リーダー / 役員
-- 承認は「申請先の上長」に限らずリーダー・役員なら誰でも行える
-- （js/approval.js の canApprove と同じ条件）
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

CREATE POLICY "projects_delete"
  ON projects FOR DELETE
  TO authenticated
  USING (
    public.app_current_user_is_admin()
    OR public.app_current_user_id() = created_by
    OR public.app_current_user_id() = main_editor
  );


-- ========================================
-- 6. 案件の子テーブル
-- ========================================
-- 親案件の権限に従わせる。
-- アプリは更新時に「全削除 → 再INSERT」を行うため、
-- 編集できる人には INSERT / UPDATE / DELETE をまとめて許可する。

ALTER TABLE estimate_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_urls     ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_history       ENABLE ROW LEVEL SECURITY;

-- ---------- estimate_breakdown ----------
DROP POLICY IF EXISTS "Users can view estimate breakdown of accessible projects" ON estimate_breakdown;
DROP POLICY IF EXISTS "Project creators can manage estimate breakdown" ON estimate_breakdown;
DROP POLICY IF EXISTS "estimate_breakdown_insert_policy" ON estimate_breakdown;
DROP POLICY IF EXISTS "estimate_breakdown_update_policy" ON estimate_breakdown;
DROP POLICY IF EXISTS "estimate_breakdown_delete_policy" ON estimate_breakdown;
DROP POLICY IF EXISTS "estimate_breakdown_select"        ON estimate_breakdown;
DROP POLICY IF EXISTS "estimate_breakdown_write"         ON estimate_breakdown;

CREATE POLICY "estimate_breakdown_select"
  ON estimate_breakdown FOR SELECT TO authenticated
  USING (public.app_can_view_project(project_id));
CREATE POLICY "estimate_breakdown_write"
  ON estimate_breakdown FOR ALL TO authenticated
  USING (public.app_can_edit_project(project_id))
  WITH CHECK (public.app_can_edit_project(project_id));

-- ---------- completed_urls ----------
DROP POLICY IF EXISTS "Users can view completed urls of accessible projects" ON completed_urls;
DROP POLICY IF EXISTS "Project creators can manage completed urls" ON completed_urls;
DROP POLICY IF EXISTS "completed_urls_insert_policy" ON completed_urls;
DROP POLICY IF EXISTS "completed_urls_update_policy" ON completed_urls;
DROP POLICY IF EXISTS "completed_urls_delete_policy" ON completed_urls;
DROP POLICY IF EXISTS "completed_urls_select"        ON completed_urls;
DROP POLICY IF EXISTS "completed_urls_write"         ON completed_urls;

CREATE POLICY "completed_urls_select"
  ON completed_urls FOR SELECT TO authenticated
  USING (public.app_can_view_project(project_id));
CREATE POLICY "completed_urls_write"
  ON completed_urls FOR ALL TO authenticated
  USING (public.app_can_edit_project(project_id))
  WITH CHECK (public.app_can_edit_project(project_id));

-- ---------- project_milestones ----------
DROP POLICY IF EXISTS "project_milestones_all_authenticated"    ON project_milestones;
DROP POLICY IF EXISTS "project_milestones_select_authenticated" ON project_milestones;
DROP POLICY IF EXISTS "project_milestones_select"               ON project_milestones;
DROP POLICY IF EXISTS "project_milestones_write"                ON project_milestones;

CREATE POLICY "project_milestones_select"
  ON project_milestones FOR SELECT TO authenticated
  USING (public.app_can_view_project(project_id));
CREATE POLICY "project_milestones_write"
  ON project_milestones FOR ALL TO authenticated
  USING (public.app_can_edit_project(project_id))
  WITH CHECK (public.app_can_edit_project(project_id));

-- ---------- edit_history ----------
-- 編集時間はサブ編集者も登録するため、他とは条件が異なる。
--   閲覧    : 案件関係者（サブ編集者含む）＋リーダー/役員
--   追加    : 本人分のみ（editor = 自分）。案件を閲覧できることも条件
--   更新/削除: 案件を編集できる人（案件更新時の洗い替え・案件削除で必要）
DROP POLICY IF EXISTS "Users can view their own edit history"     ON edit_history;
DROP POLICY IF EXISTS "Project members can view edit history"     ON edit_history;
DROP POLICY IF EXISTS "Leaders and executives can view all edit history" ON edit_history;
DROP POLICY IF EXISTS "Authenticated users can insert edit history" ON edit_history;
DROP POLICY IF EXISTS "edit_history_insert_policy" ON edit_history;
DROP POLICY IF EXISTS "edit_history_update_policy" ON edit_history;
DROP POLICY IF EXISTS "edit_history_delete_policy" ON edit_history;
DROP POLICY IF EXISTS "edit_history_select"        ON edit_history;
DROP POLICY IF EXISTS "edit_history_insert_own"    ON edit_history;
DROP POLICY IF EXISTS "edit_history_update"        ON edit_history;
DROP POLICY IF EXISTS "edit_history_delete"        ON edit_history;

CREATE POLICY "edit_history_select"
  ON edit_history FOR SELECT TO authenticated
  USING (
    editor = public.app_current_user_id()
    OR public.app_can_view_project(project_id)
  );
CREATE POLICY "edit_history_insert_own"
  ON edit_history FOR INSERT TO authenticated
  WITH CHECK (
    editor = public.app_current_user_id()
    AND public.app_can_view_project(project_id)
  );
CREATE POLICY "edit_history_update"
  ON edit_history FOR UPDATE TO authenticated
  USING (public.app_can_edit_project(project_id))
  WITH CHECK (public.app_can_edit_project(project_id));
CREATE POLICY "edit_history_delete"
  ON edit_history FOR DELETE TO authenticated
  USING (public.app_can_edit_project(project_id));


-- ========================================
-- 7. leader_evaluation テーブル
-- ========================================

ALTER TABLE leader_evaluation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaders and executives can view evaluations"   ON leader_evaluation;
DROP POLICY IF EXISTS "Leaders and executives can manage evaluations" ON leader_evaluation;

CREATE POLICY "Leaders and executives can view evaluations"
  ON leader_evaluation FOR SELECT
  USING (public.app_current_user_role() IN ('leader', 'executive'));

CREATE POLICY "Leaders and executives can manage evaluations"
  ON leader_evaluation FOR ALL
  USING (public.app_current_user_role() IN ('leader', 'executive'));


-- ========================================
-- 8. notifications テーブル
-- ========================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications"   ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications"          ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated"       ON notifications;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (public.app_current_user_id() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (public.app_current_user_id() = user_id);

-- 通知の作成は SECURITY DEFINER 関数（RLS迂回）が行う。
-- クライアントからの INSERT は認証済みに限定する（以前は anon でも作成できた）。
CREATE POLICY "notifications_insert_authenticated"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);


-- ========================================
-- 確認
-- ========================================
-- supabase/check_rls_policies.sql を実行してください。
-- 「素通しポリシー」として残ってよいのは以下の5件のみです:
--   affiliations_select, teams_select, milestone_types_select … マスタの閲覧
--   milestone_types_insert                                    … 編集者が工程を追加
--   notifications_insert_authenticated                        … 通知の作成
