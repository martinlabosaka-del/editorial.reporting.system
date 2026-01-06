-- ========================================
-- edit_historyテーブルのカラム名変更
-- edit_item_id → estimate_item
-- 参照先を edit_items → estimate_items に変更
-- ========================================

-- 外部キー制約を削除
ALTER TABLE edit_history DROP CONSTRAINT IF EXISTS edit_history_edit_item_id_fkey;

-- カラム名を変更
ALTER TABLE edit_history RENAME COLUMN edit_item_id TO estimate_item;

-- 新しい外部キー制約を追加
ALTER TABLE edit_history
  ADD CONSTRAINT edit_history_estimate_item_fkey
  FOREIGN KEY (estimate_item)
  REFERENCES estimate_items(id);

COMMENT ON COLUMN edit_history.estimate_item IS '編集作業項目（estimate_itemsへの外部キー）';
