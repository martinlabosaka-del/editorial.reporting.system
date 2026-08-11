-- ========================================
-- 管理者によるパスワードリセット
-- ========================================
--
-- 【問題】
-- js/api.js の resetUserPassword() は supabase.auth.admin.updateUserById() を
-- 呼んでいたが、これは service_role キーが必要な管理者APIである。
-- フロントエンドは GitHub Pages で公開されており anon key しか置けないため
-- （service_role キーを置くとDB全権限が漏れる）、この機能は必ず失敗していた。
--
-- 【対策】
-- SECURITY DEFINER 関数をDB側に用意し、関数内で呼び出し元が管理者であることを
-- 検証したうえで auth.users.encrypted_password を更新する。
-- 016〜019 の register_new_user() と同じ方式で、新たな鍵の配布が不要。
--
-- 【注意】
-- auth スキーマへの直接書き込みは Supabase の公式サポート外である。
-- GoTrue のアップグレードで auth.users の構造が変わると影響を受けうる。
-- 影響を受けるのは encrypted_password カラムのみで、これは GoTrue の
-- 根幹であり変更される可能性は低いが、把握しておくこと。
-- 公式に沿うなら service_role キーを持つ Edge Function に置き換える。
-- ========================================


CREATE OR REPLACE FUNCTION admin_reset_user_password(
  p_user_id TEXT,
  p_new_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_is_admin BOOLEAN;
  v_auth_user_id UUID;
  v_target_name TEXT;
BEGIN
  -- ========================================
  -- 呼び出し元の検証
  -- ========================================
  -- 未ログイン（anon）の場合、auth.uid() は NULL になる
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'ログインが必要です'
    );
  END IF;

  SELECT COALESCE(is_admin, false) INTO v_caller_is_admin
  FROM users
  WHERE auth_user_id = auth.uid()
    AND COALESCE(is_active, false) = true;

  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'パスワードのリセットには管理者権限が必要です'
    );
  END IF;

  -- ========================================
  -- パスワードの検証
  -- ========================================
  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'パスワードは8文字以上で入力してください'
    );
  END IF;

  -- ========================================
  -- 対象ユーザーの特定
  -- ========================================
  SELECT auth_user_id, name INTO v_auth_user_id, v_target_name
  FROM users
  WHERE user_id = p_user_id;

  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '対象のユーザーが見つかりません'
    );
  END IF;

  -- ========================================
  -- パスワードを更新
  -- ========================================
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_auth_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '認証ユーザーが見つかりません'
    );
  END IF;

  -- 既存のログインセッションを無効化する（best effort）
  -- auth.refresh_tokens は GoTrue の内部テーブルのため、
  -- 構造が変わっていても本体の処理が失敗しないよう例外を握りつぶす。
  BEGIN
    DELETE FROM auth.refresh_tokens
    WHERE user_id = v_auth_user_id::text;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', v_target_name || ' のパスワードをリセットしました'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'パスワードのリセットに失敗しました: ' || SQLERRM
    );
END;
$$;


-- ========================================
-- 実行権限
-- ========================================
-- anon からは実行させない（関数内でも auth.uid() を検証しているが二重に防ぐ）

REVOKE ALL ON FUNCTION admin_reset_user_password(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_reset_user_password(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION admin_reset_user_password(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_reset_user_password(TEXT, TEXT) IS
  '管理者(is_admin)のみが実行可能なパスワードリセット関数。anonからの実行は不可。';


-- ========================================
-- 適用後の確認用クエリ（手動で実行してください）
-- ========================================

-- (1) anon に実行権限が付いていないことを確認 → 0件ならOK
--
-- SELECT grantee, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_name = 'admin_reset_user_password'
--   AND grantee IN ('anon', 'PUBLIC');

-- (2) 動作確認は必ずアプリ（ブラウザ）から行うこと。
--     SQL Editor は postgres ロールで動くため auth.uid() が NULL になり、
--     「ログインが必要です」が返るのが正常。
--
--     管理画面 → 対象ユーザーの「パスワード」ボタン → 新パスワードを入力
--     → 一度ログアウトし、そのユーザーで新パスワードでログインできることを確認
