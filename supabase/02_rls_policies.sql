-- ========================================
-- Row Level Security (RLS) ポリシー設定
-- ========================================

-- ========================================
-- 1. users テーブル
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ポリシー：自分の情報は閲覧可能
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id);

-- ポリシー：leader/executiveは全ユーザー閲覧可能
CREATE POLICY "Leaders and executives can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- ポリシー：leader/executiveはユーザー情報を更新可能
CREATE POLICY "Leaders and executives can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- ========================================
-- 2. clients テーブル
-- ========================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ポリシー：全ユーザーがクライアント情報を閲覧可能
CREATE POLICY "All authenticated users can view clients"
  ON clients FOR SELECT
  USING (auth.role() = 'authenticated');

-- ポリシー：アルバイト以外がクライアント追加可能（staff/leader/executive）
CREATE POLICY "Non part-time users can insert clients"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('staff', 'leader', 'executive')
    )
  );

-- ポリシー：アルバイト以外がクライアント更新可能
CREATE POLICY "Non part-time users can update clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('staff', 'leader', 'executive')
    )
  );

-- ========================================
-- 3. genres, technologies, estimate_items, edit_items テーブル
-- ========================================

-- genres
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view genres"
  ON genres FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Leaders and executives can manage genres"
  ON genres FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- technologies
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view technologies"
  ON technologies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Leaders and executives can manage technologies"
  ON technologies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- estimate_items
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view estimate items"
  ON estimate_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Leaders and executives can manage estimate items"
  ON estimate_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- edit_items
ALTER TABLE edit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view edit items"
  ON edit_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Leaders and executives can manage edit items"
  ON edit_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- ========================================
-- 4. projects テーブル
-- ========================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ポリシー：自分が作成した案件は閲覧可能
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND (
        users.id = projects.created_by
        OR users.id = projects.main_editor
        OR users.id = ANY(projects.sub_editors)
        OR users.id = projects.director
      )
    )
  );

-- ポリシー：leader/executiveは全案件閲覧可能
CREATE POLICY "Leaders and executives can view all projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- ポリシー：認証済みユーザーは案件を作成可能
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND users.id = created_by
    )
  );

-- ポリシー：自分が作成した案件は更新可能
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND users.id = projects.created_by
    )
  );

-- ポリシー：leaderは割り当てられた案件を更新可能（承認処理用）
CREATE POLICY "Leaders can update assigned projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role = 'leader'
      AND users.id = projects.assigned_leader
    )
  );

-- ポリシー：executiveは全案件を更新可能
CREATE POLICY "Executives can update all projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role = 'executive'
    )
  );

-- ========================================
-- 5. estimate_breakdown テーブル
-- ========================================

ALTER TABLE estimate_breakdown ENABLE ROW LEVEL SECURITY;

-- ポリシー：案件にアクセス可能なユーザーは見積内訳も閲覧可能
CREATE POLICY "Users can view estimate breakdown of accessible projects"
  ON estimate_breakdown FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN users u ON u.auth_user_id = auth.uid()
      WHERE p.id = estimate_breakdown.project_id
      AND (
        u.id = p.created_by
        OR u.id = p.main_editor
        OR u.id = ANY(p.sub_editors)
        OR u.id = p.director
        OR u.role IN ('leader', 'executive')
      )
    )
  );

-- ポリシー：案件作成者は見積内訳を追加・更新可能
CREATE POLICY "Project creators can manage estimate breakdown"
  ON estimate_breakdown FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN users u ON u.auth_user_id = auth.uid()
      WHERE p.id = estimate_breakdown.project_id
      AND u.id = p.created_by
    )
  );

-- ========================================
-- 6. edit_history テーブル
-- ========================================

ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;

-- ポリシー：自分の編集履歴は閲覧可能
CREATE POLICY "Users can view their own edit history"
  ON edit_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND users.id = edit_history.editor
    )
  );

-- ポリシー：案件関係者は編集履歴を閲覧可能
CREATE POLICY "Project members can view edit history"
  ON edit_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN users u ON u.auth_user_id = auth.uid()
      WHERE p.id = edit_history.project_id
      AND (
        u.id = p.created_by
        OR u.id = p.main_editor
        OR u.id = ANY(p.sub_editors)
        OR u.id = p.director
      )
    )
  );

-- ポリシー：leader/executiveは全履歴閲覧可能
CREATE POLICY "Leaders and executives can view all edit history"
  ON edit_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- ポリシー：認証済みユーザーは編集履歴を追加可能
CREATE POLICY "Authenticated users can insert edit history"
  ON edit_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND users.id = edit_history.editor
    )
  );

-- ========================================
-- 7. leader_evaluation テーブル
-- ========================================

ALTER TABLE leader_evaluation ENABLE ROW LEVEL SECURITY;

-- ポリシー：leader以上が閲覧可能
CREATE POLICY "Leaders and executives can view evaluations"
  ON leader_evaluation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- ポリシー：leader以上が評価を追加・更新可能
CREATE POLICY "Leaders and executives can manage evaluations"
  ON leader_evaluation FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND role IN ('leader', 'executive')
    )
  );

-- ========================================
-- 8. notifications テーブル
-- ========================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ポリシー：自分宛の通知のみ閲覧可能
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND users.id = notifications.user_id
    )
  );

-- ポリシー：自分宛の通知を既読に更新可能
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND users.id = notifications.user_id
    )
  );

-- ポリシー：システムが通知を作成可能（service_role）
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
