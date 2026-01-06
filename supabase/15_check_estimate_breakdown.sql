-- ========================================
-- estimate_breakdownテーブルの現在の状態を確認
-- ========================================

-- カラム構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'estimate_breakdown'
ORDER BY ordinal_position;

-- 外部キー制約を確認
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name='estimate_breakdown';

-- インデックスを確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'estimate_breakdown';

-- データのサンプルを確認
SELECT *
FROM estimate_breakdown
LIMIT 5;
