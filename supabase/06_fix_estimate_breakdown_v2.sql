-- ========================================
-- estimate_breakdownテーブルの外部キー修正
-- estimate_items → edit_items に変更
-- ========================================

-- 既存のデータを削除（テスト段階のため）
TRUNCATE TABLE estimate_breakdown CASCADE;

-- 外部キー制約を削除（存在する場合のみ）
ALTER TABLE estimate_breakdown
  DROP CONSTRAINT IF EXISTS estimate_breakdown_estimate_item_id_fkey;

-- カラムが存在するか確認して、存在する場合は名前を変更
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'estimate_breakdown' AND column_name = 'estimate_item_id'
  ) THEN
    ALTER TABLE estimate_breakdown RENAME COLUMN estimate_item_id TO edit_item_id;
  END IF;
END $$;

-- カラムが存在しない場合は作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'estimate_breakdown' AND column_name = 'edit_item_id'
  ) THEN
    ALTER TABLE estimate_breakdown ADD COLUMN edit_item_id UUID NOT NULL;
  END IF;
END $$;

-- インデックスを削除して再作成
DROP INDEX IF EXISTS idx_estimate_breakdown_estimate_item_id;
DROP INDEX IF EXISTS idx_estimate_breakdown_edit_item_id;
CREATE INDEX idx_estimate_breakdown_edit_item_id ON estimate_breakdown(edit_item_id);

-- 新しい外部キー制約を追加
ALTER TABLE estimate_breakdown
  DROP CONSTRAINT IF EXISTS estimate_breakdown_edit_item_id_fkey;

ALTER TABLE estimate_breakdown
  ADD CONSTRAINT estimate_breakdown_edit_item_id_fkey
  FOREIGN KEY (edit_item_id) REFERENCES edit_items(id);

-- コメント更新
COMMENT ON COLUMN estimate_breakdown.edit_item_id IS '編集作業項目ID（edit_itemsテーブル参照）';
