-- ========================================
-- RLSポリシーの現状確認（読み取り専用）
-- ========================================
--
-- 目的：
--   リポジトリの 02_rls_policies.sql / migrations/017_fix_rls_policies.sql が
--   本番DBに実際どう適用されているか不明なため、現状を棚卸しする。
--
-- 使い方：
--   Supabase ダッシュボード → SQL Editor で (1)〜(5) を順に実行し、
--   結果をそのまま貼り付けてください。
--   ※ SELECT のみです。データもポリシーも変更しません。
-- ========================================


-- ========================================
-- (1) 全ポリシー一覧【最重要】
-- ========================================
-- permissive = PERMISSIVE のポリシーは OR で結合されるため、
-- 1つでも qual が "true" のものがあると、他の制限は無意味になる。

SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual        AS using_expr,
  with_check  AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;


-- ========================================
-- (2) 素通しポリシーの抽出
-- ========================================
-- ここに出たものが「実質ノーガード」になっている原因。

SELECT
  tablename,
  policyname,
  cmd,
  qual       AS using_expr,
  with_check AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
  AND (
    COALESCE(qual, 'true') IN ('true', '(true)')
    OR COALESCE(with_check, 'true') IN ('true', '(true)')
  )
ORDER BY tablename, cmd;


-- ========================================
-- (3) RLSが有効になっているか
-- ========================================
-- rls_enabled = false のテーブルは、ポリシー以前に全公開。
-- rls_forced はテーブル所有者にもRLSを適用するかの設定。

SELECT
  c.relname                AS tablename,
  c.relrowsecurity         AS rls_enabled,
  c.relforcerowsecurity    AS rls_forced,
  COUNT(p.policyname)      AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p
       ON p.schemaname = n.nspname
      AND p.tablename  = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY c.relname;


-- ========================================
-- (4) anon / authenticated へのテーブル権限
-- ========================================
-- RLSの手前にあるGRANT。anon に INSERT/UPDATE/DELETE があると
-- 未ログインでも書き込みを試せる状態（RLSで弾かれるかは別問題）。

SELECT
  table_name,
  grantee,
  STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;


-- ========================================
-- (5) SECURITY DEFINER 関数の一覧
-- ========================================
-- SECURITY DEFINER はRLSを迂回するため、anon/PUBLIC に EXECUTE が
-- 付いていないかを確認する（019 で register_new_user を修正済み）。

SELECT
  p.proname                                   AS function_name,
  pg_get_function_identity_arguments(p.oid)   AS arguments,
  p.prosecdef                                 AS is_security_definer,
  COALESCE(
    (SELECT STRING_AGG(DISTINCT rp.grantee, ', ')
     FROM information_schema.routine_privileges rp
     WHERE rp.routine_schema = 'public'
       AND rp.routine_name = p.proname
       AND rp.grantee IN ('anon', 'PUBLIC')),
    '(なし)'
  ) AS anon_or_public_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;
