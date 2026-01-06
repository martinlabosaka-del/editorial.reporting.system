-- ========================================
-- estimate_breakdownテーブルのデータ確認
-- ========================================

SELECT
    eb.breakdown_id,
    p.project_name,
    ei.edit_item_name,
    eb.amount,
    ei.hourly_rate,
    eb.created_at
FROM estimate_breakdown eb
LEFT JOIN projects p ON eb.project_id = p.id
LEFT JOIN edit_items ei ON eb.edit_item_id = ei.id
ORDER BY eb.created_at DESC
LIMIT 20;
