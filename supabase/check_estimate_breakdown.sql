-- ========================================
-- estimate_breakdownテーブルの構造確認
-- ========================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'estimate_breakdown'
ORDER BY ordinal_position;
