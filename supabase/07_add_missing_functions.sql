-- ========================================
-- 不足している関数の追加と修正
-- ========================================

-- ========================================
-- 1. breakdown_id自動生成関数を追加
-- ========================================

CREATE OR REPLACE FUNCTION generate_breakdown_id()
RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  counter INTEGER;
  new_id TEXT;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 今日の最大カウンターを取得
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(breakdown_id FROM 'BRK-[0-9]{8}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM estimate_breakdown
  WHERE breakdown_id LIKE 'BRK-' || today_str || '-%';

  new_id := 'BRK-' || today_str || '-' || LPAD(counter::TEXT, 3, '0');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. calculate_target_hours関数を修正（edit_itemsを参照）
-- ========================================

CREATE OR REPLACE FUNCTION calculate_target_hours(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_minutes INTEGER := 0;
  breakdown_record RECORD;
BEGIN
  FOR breakdown_record IN
    SELECT eb.amount, ei.hourly_rate
    FROM estimate_breakdown eb
    JOIN edit_items ei ON eb.edit_item_id = ei.id
    WHERE eb.project_id = p_project_id
  LOOP
    -- 金額 ÷ 時給 で時間を算出、分に変換
    total_minutes := total_minutes + ROUND((breakdown_record.amount / breakdown_record.hourly_rate) * 60);
  END LOOP;

  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql;
