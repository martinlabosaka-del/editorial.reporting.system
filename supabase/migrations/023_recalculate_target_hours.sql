-- ========================================
-- 既存案件の編集目標時間・編集費合計を、見積内訳から再計算する
-- ========================================
--
-- 【背景】
-- projects.target_hours は案件の新規登録時（js/api.js の saveProject）にしか
-- 計算されておらず、updateProject に再計算処理が無かった。
-- そのため「案件詳細登録」で見積内訳を修正しても、目標時間は登録時のまま
-- 更新されず、評価の主軸である「目標と実働の差」が誤った値になっていた。
--
-- JS側は 023 と同時にリリースする修正で再計算するようになるが、
-- それは今後の更新に対してのみ効く。**既にずれている案件は直らない**ため、
-- このSQLで一度だけ全件を計算し直す。
--
-- 【計算式】JS側（calculateEstimateTotals）と一致させている
--   estimate_total = Σ 内訳の金額
--   target_hours   = Σ ROUND(金額 ÷ 時給 × 60)   ← 分単位・項目ごとに四捨五入
--   時給は edit_items.hourly_rate を参照する
--   （見積内訳が参照するマスタは edit_items。命名と参照先が逆転している点に注意）
--
-- 【注意】
-- ・projects には updated_at の自動更新トリガーがあるため、
--   更新対象になった案件の updated_at は実行日時に変わる。
-- ・見積内訳が1行も無い案件は対象外（既存の値をそのまま残す）。
--   0 にしたい場合は末尾の「補足」を参照。
-- ========================================


-- ========================================
-- STEP 1. 適用前の確認（先にこれだけを実行してください）
-- ========================================
-- 現在値と再計算値の差分を一覧します。
-- 想定外の件数・差が出ていないかを確認してから STEP 2 に進んでください。
--
-- WITH calculated AS (
--   SELECT
--     b.project_id,
--     SUM(b.amount) AS calc_estimate_total,
--     SUM(
--       CASE WHEN COALESCE(e.hourly_rate, 0) > 0
--            THEN ROUND(b.amount / e.hourly_rate * 60)
--            ELSE 0
--       END
--     )::INTEGER AS calc_target_hours
--   FROM estimate_breakdown b
--   LEFT JOIN edit_items e ON e.id = b.edit_item_id
--   GROUP BY b.project_id
-- )
-- SELECT
--   p.project_id,
--   p.project_name,
--   p.status,
--   p.target_hours   AS 現在の目標時間_分,
--   c.calc_target_hours AS 再計算後_分,
--   c.calc_target_hours - COALESCE(p.target_hours, 0) AS 差_分,
--   p.estimate_total AS 現在の編集費合計,
--   c.calc_estimate_total AS 再計算後_編集費合計
-- FROM projects p
-- JOIN calculated c ON c.project_id = p.id
-- WHERE p.target_hours   IS DISTINCT FROM c.calc_target_hours
--    OR p.estimate_total IS DISTINCT FROM c.calc_estimate_total
-- ORDER BY ABS(c.calc_target_hours - COALESCE(p.target_hours, 0)) DESC;


-- ========================================
-- STEP 2. 再計算の適用
-- ========================================

WITH calculated AS (
  SELECT
    b.project_id,
    SUM(b.amount) AS calc_estimate_total,
    SUM(
      CASE WHEN COALESCE(e.hourly_rate, 0) > 0
           THEN ROUND(b.amount / e.hourly_rate * 60)
           ELSE 0
      END
    )::INTEGER AS calc_target_hours
  FROM estimate_breakdown b
  LEFT JOIN edit_items e ON e.id = b.edit_item_id
  GROUP BY b.project_id
)
UPDATE projects p
SET
  target_hours   = c.calc_target_hours,
  estimate_total = c.calc_estimate_total
FROM calculated c
WHERE p.id = c.project_id
  AND (
    p.target_hours   IS DISTINCT FROM c.calc_target_hours
    OR p.estimate_total IS DISTINCT FROM c.calc_estimate_total
  );


-- ========================================
-- STEP 3. 適用後の確認（手動で実行してください）
-- ========================================
-- 差分が0件になっていれば成功です。
--
-- WITH calculated AS (
--   SELECT
--     b.project_id,
--     SUM(b.amount) AS calc_estimate_total,
--     SUM(
--       CASE WHEN COALESCE(e.hourly_rate, 0) > 0
--            THEN ROUND(b.amount / e.hourly_rate * 60)
--            ELSE 0
--       END
--     )::INTEGER AS calc_target_hours
--   FROM estimate_breakdown b
--   LEFT JOIN edit_items e ON e.id = b.edit_item_id
--   GROUP BY b.project_id
-- )
-- SELECT COUNT(*) AS 残っている不一致件数
-- FROM projects p
-- JOIN calculated c ON c.project_id = p.id
-- WHERE p.target_hours   IS DISTINCT FROM c.calc_target_hours
--    OR p.estimate_total IS DISTINCT FROM c.calc_estimate_total;


-- ========================================
-- 補足1. 見積内訳が無いのに目標時間が入っている案件の確認
-- ========================================
-- 内訳を全部消した案件などが該当します。STEP 2 の対象外なので、
-- 必要なら中身を確認したうえで手動で 0 にしてください。
--
-- SELECT p.project_id, p.project_name, p.status, p.target_hours, p.estimate_total
-- FROM projects p
-- WHERE NOT EXISTS (SELECT 1 FROM estimate_breakdown b WHERE b.project_id = p.id)
--   AND (COALESCE(p.target_hours, 0) <> 0 OR COALESCE(p.estimate_total, 0) <> 0);


-- ========================================
-- 補足2. 時給が未設定の見積項目の確認
-- ========================================
-- 時給が0またはNULLの項目は、金額を入れても目標時間に反映されません。
-- 該当があると、その案件の目標時間は実態より短く出ます。
--
-- SELECT e.edit_item_id, e.edit_item_name, e.hourly_rate, COUNT(b.id) AS 使用件数
-- FROM edit_items e
-- LEFT JOIN estimate_breakdown b ON b.edit_item_id = e.id
-- WHERE COALESCE(e.hourly_rate, 0) <= 0
-- GROUP BY e.edit_item_id, e.edit_item_name, e.hourly_rate;
