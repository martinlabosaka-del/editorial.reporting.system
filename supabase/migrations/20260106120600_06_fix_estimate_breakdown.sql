-- ========================================
-- estimate_breakdownテーブルの外部キー修正
-- estimate_items → edit_items に変更
-- ========================================

-- 既存のデータを削除（テスト段階のため）
TRUNCATE TABLE estimate_breakdown CASCADE;

-- 外部キー制約を削除
ALTER TABLE estimate_breakdown
  DROP CONSTRAINT IF EXISTS estimate_breakdown_estimate_item_id_fkey;

-- カラム名を変更
ALTER TABLE estimate_breakdown
  RENAME COLUMN estimate_item_id TO edit_item_id;

-- インデックスを削除して再作成
DROP INDEX IF EXISTS idx_estimate_breakdown_estimate_item_id;
CREATE INDEX idx_estimate_breakdown_edit_item_id ON estimate_breakdown(edit_item_id);

-- 新しい外部キー制約を追加
ALTER TABLE estimate_breakdown
  ADD CONSTRAINT estimate_breakdown_edit_item_id_fkey
  FOREIGN KEY (edit_item_id) REFERENCES edit_items(id);

-- コメント更新
COMMENT ON COLUMN estimate_breakdown.edit_item_id IS '編集作業項目ID（edit_itemsテーブル参照）';
