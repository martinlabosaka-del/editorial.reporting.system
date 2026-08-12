-- ========================================
-- edit_historyテーブルの構造を修正
-- ========================================

-- 既存のカラム名を確認して適切に変更
DO $$
BEGIN
    -- edit_item_id カラムが存在する場合は estimate_item にリネーム
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'edit_history'
        AND column_name = 'edit_item_id'
    ) THEN
        -- 外部キー制約を削除
        ALTER TABLE edit_history DROP CONSTRAINT IF EXISTS edit_history_edit_item_id_fkey;

        -- カラム名を変更
        ALTER TABLE edit_history RENAME COLUMN edit_item_id TO estimate_item;

        -- 新しい外部キー制約を追加
        ALTER TABLE edit_history
          ADD CONSTRAINT edit_history_estimate_item_fkey
          FOREIGN KEY (estimate_item)
          REFERENCES estimate_items(id);

        RAISE NOTICE 'edit_item_id を estimate_item にリネームしました';
    END IF;

    -- edit_item カラムが存在する場合は estimate_item にリネーム
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'edit_history'
        AND column_name = 'edit_item'
    ) THEN
        -- 外部キー制約を削除
        ALTER TABLE edit_history DROP CONSTRAINT IF EXISTS edit_history_edit_item_fkey;

        -- カラム名を変更
        ALTER TABLE edit_history RENAME COLUMN edit_item TO estimate_item;

        -- 新しい外部キー制約を追加
        ALTER TABLE edit_history
          ADD CONSTRAINT edit_history_estimate_item_fkey
          FOREIGN KEY (estimate_item)
          REFERENCES estimate_items(id);

        RAISE NOTICE 'edit_item を estimate_item にリネームしました';
    END IF;

    -- estimate_item カラムが既に存在する場合
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'edit_history'
        AND column_name = 'estimate_item'
    ) THEN
        RAISE NOTICE 'estimate_item カラムは既に存在します';
    END IF;
END $$;
