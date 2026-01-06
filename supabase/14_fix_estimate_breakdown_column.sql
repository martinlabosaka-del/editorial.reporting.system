-- ========================================
-- estimate_breakdownテーブルのカラム名修正
-- ========================================

-- estimate_item_id を edit_item_id に変更
-- estimate_breakdownは編集作業項目（edit_items）を参照すべき

-- 1. 外部キー制約を削除
ALTER TABLE estimate_breakdown
DROP CONSTRAINT IF EXISTS estimate_breakdown_estimate_item_id_fkey;

-- 2. カラム名を変更
ALTER TABLE estimate_breakdown
RENAME COLUMN estimate_item_id TO edit_item_id;

-- 3. 新しい外部キー制約を追加（edit_itemsテーブルを参照）
ALTER TABLE estimate_breakdown
ADD CONSTRAINT estimate_breakdown_edit_item_id_fkey
FOREIGN KEY (edit_item_id) REFERENCES edit_items(id);

-- 4. インデックス名も更新
DROP INDEX IF EXISTS idx_estimate_breakdown_estimate_item_id;
CREATE INDEX idx_estimate_breakdown_edit_item_id ON estimate_breakdown(edit_item_id);

-- 確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'estimate_breakdown'
ORDER BY ordinal_position;
