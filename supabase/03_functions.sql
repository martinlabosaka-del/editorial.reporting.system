-- ========================================
-- PostgreSQL関数とトリガー
-- ========================================

-- ========================================
-- 1. 編集目標時間の自動計算
-- ========================================

-- 案件の編集目標時間を計算する関数
CREATE OR REPLACE FUNCTION calculate_target_hours(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_minutes INTEGER := 0;
  breakdown_record RECORD;
BEGIN
  FOR breakdown_record IN
    SELECT eb.amount, ei.hourly_rate
    FROM estimate_breakdown eb
    JOIN estimate_items ei ON eb.estimate_item_id = ei.id
    WHERE eb.project_id = p_project_id
  LOOP
    -- 金額 ÷ 時給 で時間を算出、分に変換
    total_minutes := total_minutes + ROUND((breakdown_record.amount / breakdown_record.hourly_rate) * 60);
  END LOOP;

  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. 実働編集時間の自動計算
-- ========================================

-- 案件の実働編集時間を計算する関数
CREATE OR REPLACE FUNCTION calculate_actual_hours(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_minutes INTEGER;
BEGIN
  SELECT COALESCE(SUM(edit_time), 0)
  INTO total_minutes
  FROM edit_history
  WHERE project_id = p_project_id;

  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. 実働編集費の自動計算
-- ========================================

-- 案件の実働編集費を計算する関数
CREATE OR REPLACE FUNCTION calculate_actual_cost(p_project_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_cost NUMERIC := 0;
  history_record RECORD;
BEGIN
  FOR history_record IN
    SELECT eh.edit_time, ei.hourly_rate
    FROM edit_history eh
    JOIN edit_items ei ON eh.edit_item_id = ei.id
    WHERE eh.project_id = p_project_id
  LOOP
    -- 編集時間（分）÷60 × 時給
    total_cost := total_cost + (history_record.edit_time / 60.0) * history_record.hourly_rate;
  END LOOP;

  RETURN ROUND(total_cost, 2);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. トリガー：見積内訳更新時に目標時間を自動更新
-- ========================================

-- 見積内訳が更新されたら目標時間を自動更新
CREATE OR REPLACE FUNCTION update_target_hours_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE projects
    SET target_hours = calculate_target_hours(OLD.project_id),
        updated_at = NOW()
    WHERE id = OLD.project_id;
    RETURN OLD;
  ELSE
    UPDATE projects
    SET target_hours = calculate_target_hours(NEW.project_id),
        updated_at = NOW()
    WHERE id = NEW.project_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_target_hours
AFTER INSERT OR UPDATE OR DELETE ON estimate_breakdown
FOR EACH ROW
EXECUTE FUNCTION update_target_hours_trigger();

-- ========================================
-- 5. トリガー：編集履歴更新時に実働時間を自動更新
-- ========================================

-- 編集履歴が更新されたら実働時間を自動更新
CREATE OR REPLACE FUNCTION update_actual_hours_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE projects
    SET actual_hours = calculate_actual_hours(OLD.project_id),
        updated_at = NOW()
    WHERE id = OLD.project_id;
    RETURN OLD;
  ELSE
    UPDATE projects
    SET actual_hours = calculate_actual_hours(NEW.project_id),
        updated_at = NOW()
    WHERE id = NEW.project_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_actual_hours
AFTER INSERT OR UPDATE OR DELETE ON edit_history
FOR EACH ROW
EXECUTE FUNCTION update_actual_hours_trigger();

-- ========================================
-- 6. 案件申請処理
-- ========================================

CREATE OR REPLACE FUNCTION submit_project(
  p_project_id UUID,
  p_assigned_leader UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_project_name TEXT;
  v_creator_id UUID;
BEGIN
  -- 案件情報を取得
  SELECT project_name, created_by
  INTO v_project_name, v_creator_id
  FROM projects
  WHERE id = p_project_id;

  -- 案件ステータスを更新
  UPDATE projects
  SET status = 'submitted',
      submitted_at = NOW(),
      assigned_leader = p_assigned_leader,
      updated_at = NOW()
  WHERE id = p_project_id;

  -- 通知を作成
  INSERT INTO notifications (
    notification_id,
    user_id,
    project_id,
    notification_type,
    title,
    message
  ) VALUES (
    'NOTIF-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substr(md5(random()::text), 1, 6),
    p_assigned_leader,
    p_project_id,
    'submitted',
    '新規案件が申請されました',
    '案件「' || v_project_name || '」の承認をお願いします'
  );

  result := json_build_object(
    'success', true,
    'message', '案件を申請しました'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. リーダー承認処理
-- ========================================

CREATE OR REPLACE FUNCTION approve_project_by_leader(
  p_project_id UUID,
  p_leader_id UUID,
  p_evaluation_data JSONB
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_project_name TEXT;
  v_creator_id UUID;
  v_evaluation_id TEXT;
BEGIN
  -- 案件情報を取得
  SELECT project_name, created_by
  INTO v_project_name, v_creator_id
  FROM projects
  WHERE id = p_project_id;

  -- 案件ステータスを更新
  UPDATE projects
  SET status = 'leader_approved',
      leader_approved_at = NOW(),
      leader_approved_by = p_leader_id,
      leader_message = p_evaluation_data->>'leader_message',
      updated_at = NOW()
  WHERE id = p_project_id;

  -- リーダー評価を保存
  v_evaluation_id := 'EVAL-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO leader_evaluation (
    evaluation_id,
    project_id,
    required_skills_tech,
    required_skills_attitude,
    training_content_tech,
    training_content_attitude,
    other_notes,
    profit_amount,
    profit_rate,
    created_by
  ) VALUES (
    v_evaluation_id,
    p_project_id,
    p_evaluation_data->>'required_skills_tech',
    p_evaluation_data->>'required_skills_attitude',
    p_evaluation_data->>'training_content_tech',
    p_evaluation_data->>'training_content_attitude',
    p_evaluation_data->>'other_notes',
    (p_evaluation_data->>'profit_amount')::NUMERIC,
    (p_evaluation_data->>'profit_rate')::NUMERIC,
    p_leader_id
  );

  -- 作成者に通知
  INSERT INTO notifications (
    notification_id,
    user_id,
    project_id,
    notification_type,
    title,
    message
  ) VALUES (
    'NOTIF-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substr(md5(random()::text), 1, 6),
    v_creator_id,
    p_project_id,
    'approved',
    '案件がリーダーに承認されました',
    '案件「' || v_project_name || '」がリーダーに承認されました'
  );

  result := json_build_object(
    'success', true,
    'message', '案件を承認しました'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. リーダー差戻処理
-- ========================================

CREATE OR REPLACE FUNCTION reject_project_by_leader(
  p_project_id UUID,
  p_leader_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_project_name TEXT;
  v_creator_id UUID;
BEGIN
  -- 案件情報を取得
  SELECT project_name, created_by
  INTO v_project_name, v_creator_id
  FROM projects
  WHERE id = p_project_id;

  -- 案件ステータスを更新
  UPDATE projects
  SET status = 'rejected',
      leader_rejection_reason = p_rejection_reason,
      updated_at = NOW()
  WHERE id = p_project_id;

  -- 作成者に通知
  INSERT INTO notifications (
    notification_id,
    user_id,
    project_id,
    notification_type,
    title,
    message
  ) VALUES (
    'NOTIF-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substr(md5(random()::text), 1, 6),
    v_creator_id,
    p_project_id,
    'rejected',
    '案件が差戻されました',
    '案件「' || v_project_name || '」が差戻されました。理由: ' || p_rejection_reason
  );

  result := json_build_object(
    'success', true,
    'message', '案件を差戻しました'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. 役員承認処理
-- ========================================

CREATE OR REPLACE FUNCTION approve_project_by_executive(
  p_project_id UUID,
  p_executive_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_project_name TEXT;
  v_creator_id UUID;
BEGIN
  -- 案件情報を取得
  SELECT project_name, created_by
  INTO v_project_name, v_creator_id
  FROM projects
  WHERE id = p_project_id;

  -- 案件ステータスを更新
  UPDATE projects
  SET status = 'executive_approved',
      executive_approved_at = NOW(),
      executive_approved_by = p_executive_id,
      updated_at = NOW()
  WHERE id = p_project_id;

  -- 作成者に通知
  INSERT INTO notifications (
    notification_id,
    user_id,
    project_id,
    notification_type,
    title,
    message
  ) VALUES (
    'NOTIF-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substr(md5(random()::text), 1, 6),
    v_creator_id,
    p_project_id,
    'approved',
    '案件が最終承認されました',
    '案件「' || v_project_name || '」が最終承認されました'
  );

  result := json_build_object(
    'success', true,
    'message', '案件を最終承認しました'
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 10. プロジェクトID自動生成
-- ========================================

CREATE OR REPLACE FUNCTION generate_project_id()
RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  counter INTEGER;
  new_id TEXT;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 今日の最大カウンターを取得
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(project_id FROM 'PRJ-[0-9]{8}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM projects
  WHERE project_id LIKE 'PRJ-' || today_str || '-%';

  new_id := 'PRJ-' || today_str || '-' || LPAD(counter::TEXT, 3, '0');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 11. 編集履歴ID自動生成
-- ========================================

CREATE OR REPLACE FUNCTION generate_history_id()
RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  counter INTEGER;
  new_id TEXT;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 今日の最大カウンターを取得
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(history_id FROM 'HIS-[0-9]{8}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM edit_history
  WHERE history_id LIKE 'HIS-' || today_str || '-%';

  new_id := 'HIS-' || today_str || '-' || LPAD(counter::TEXT, 3, '0');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 12. ダッシュボードデータ取得
-- ========================================

CREATE OR REPLACE FUNCTION get_dashboard_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_in_progress_count INTEGER;
  v_submitted_count INTEGER;
  v_approved_count INTEGER;
  v_total_hours INTEGER;
  result JSON;
BEGIN
  -- 進行中の案件数
  SELECT COUNT(*)
  INTO v_in_progress_count
  FROM projects
  WHERE (main_editor = p_user_id OR created_by = p_user_id)
  AND status IN ('draft', 'submitted');

  -- 申請中の案件数
  SELECT COUNT(*)
  INTO v_submitted_count
  FROM projects
  WHERE created_by = p_user_id
  AND status = 'submitted';

  -- 承認済みの案件数（今月）
  SELECT COUNT(*)
  INTO v_approved_count
  FROM projects
  WHERE (main_editor = p_user_id OR created_by = p_user_id)
  AND status IN ('leader_approved', 'executive_approved')
  AND DATE_TRUNC('month', leader_approved_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- 今月の編集時間合計
  SELECT COALESCE(SUM(edit_time), 0)
  INTO v_total_hours
  FROM edit_history
  WHERE editor = p_user_id
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE);

  result := json_build_object(
    'in_progress', v_in_progress_count,
    'submitted', v_submitted_count,
    'approved', v_approved_count,
    'total_hours', v_total_hours
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;
