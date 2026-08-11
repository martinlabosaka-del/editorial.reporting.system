-- ========================================
-- セキュリティ修正：ユーザー登録関数の権限昇格を防止
-- ========================================
--
-- 【問題】
-- 018で作成した register_new_user() は SECURITY DEFINER（DB管理者権限で実行）
-- でありながら、呼び出し元の権限チェックが無く、さらに anon ロールに
-- EXECUTE 権限が付与されていた。
--
-- フロントエンドは GitHub Pages で公開されており、anon key は誰でも読める。
-- そのため第三者がブラウザから直接 RPC を呼び、
--   p_role = 'executive' / p_is_admin = true
-- で管理者アカウントを自作できる状態だった。
-- （関数は auth.users に email_confirmed_at = NOW() を直接 INSERT するため
--   メール認証も回避される）
--
-- 【対策】
-- 1. anon から EXECUTE 権限を剥奪する
-- 2. 関数内に「呼び出し元が有効な管理者(is_admin)であること」の
--    サーバーサイドチェックを追加する
--    （js/api.js の addUser() にあるチェックはクライアント側のみで、
--      RPCを直接叩かれると回避されるため）
-- ========================================


-- ========================================
-- 1. 呼び出し元チェック付きで関数を作成
-- ========================================
-- 引数の並び・戻り値は018と互換のため、フロントエンド側の改修は不要
--
-- 注意：REVOKE は存在しない関数に対して実行するとエラー(42883)になるため、
--       必ずこの CREATE OR REPLACE を先に実行し、その後で権限を整理する。
--       （018が未適用のDBでは7引数版がまだ存在しないため）

CREATE OR REPLACE FUNCTION register_new_user(
  p_user_id TEXT,
  p_user_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_is_editor BOOLEAN DEFAULT false,
  p_is_admin BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth_user_id UUID;
  v_existing_count INTEGER;
  v_encrypted_pw TEXT;
  v_caller_is_admin BOOLEAN;
BEGIN
  -- ========================================
  -- 【追加】呼び出し元の権限チェック
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
      'message', 'ユーザー登録には管理者権限が必要です'
    );
  END IF;

  -- ロール値の検証（usersテーブルのCHECK制約と同じ範囲に限定）
  IF p_role NOT IN ('part_time', 'staff', 'leader', 'executive') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '権限の指定が不正です'
    );
  END IF;
  -- ========================================
  -- 権限チェックここまで（以降は018と同じ処理）
  -- ========================================

  -- user_idの重複チェック
  SELECT COUNT(*) INTO v_existing_count
  FROM users
  WHERE user_id = p_user_id;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'このユーザーIDは既に使用されています'
    );
  END IF;

  -- パスワードをハッシュ化
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- auth.usersテーブルに認証ユーザーを作成
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('user_name', p_user_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_auth_user_id;

  -- usersテーブルにユーザー情報を登録（is_editor, is_adminを含む）
  INSERT INTO users (
    id,
    user_id,
    name,
    role,
    auth_user_id,
    is_active,
    is_editor,
    is_admin
  ) VALUES (
    v_auth_user_id,
    p_user_id,
    p_user_name,
    p_role,
    v_auth_user_id,
    true,
    p_is_editor,
    p_is_admin
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'ユーザーを登録しました',
    'user_id', v_auth_user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'ユーザー登録に失敗しました: ' || SQLERRM
    );
END;
$$;


-- ========================================
-- 2. 旧（5引数）版の削除
-- ========================================
-- 016で作成された5引数版。018で削除されているはずだが、
-- 018が未適用のDBではこちらが残っており、かつ anon に EXECUTE が
-- 付与されているため、権限昇格の実害があるのはこの版。
-- 7引数版に DEFAULT があるので、削除してもフロントエンドは動作する。

DROP FUNCTION IF EXISTS register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT);


-- ========================================
-- 3. 実行権限の再設定
-- ========================================
-- CREATE OR REPLACE では既存の権限が引き継がれるため、明示的に整理する
-- （ここまで来れば7引数版は必ず存在するので 42883 は発生しない）

REVOKE ALL ON FUNCTION register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) IS
  '管理者(is_admin)のみが実行可能なユーザー登録関数。anonからの実行は不可（019でセキュリティ修正）';


-- ========================================
-- 適用後の確認用クエリ（手動で実行してください）
-- ========================================

-- (1) anon に実行権限が残っていないことを確認 → 0件ならOK
--
-- SELECT grantee, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_name = 'register_new_user'
--   AND grantee IN ('anon', 'PUBLIC');

-- (2) 身に覚えのないユーザーが登録されていないか確認
--
-- SELECT user_id, name, role, is_admin, is_editor, is_active, created_at
-- FROM users
-- ORDER BY created_at DESC
-- LIMIT 50;

-- (3) usersテーブルに対応レコードが無い認証ユーザー（不正登録の痕跡）を確認 → 0件が正常
--
-- SELECT au.id, au.email, au.created_at
-- FROM auth.users au
-- LEFT JOIN users u ON u.auth_user_id = au.id
-- WHERE u.id IS NULL
-- ORDER BY au.created_at DESC;
