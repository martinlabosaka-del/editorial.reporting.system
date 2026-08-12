-- ========================================
-- ユーザー登録用のPostgreSQL関数
-- フロントエンドから呼び出し可能
-- ========================================

-- pgcrypto拡張機能を有効化（パスワードハッシュ化に必要）
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 既存の関数を削除（存在する場合）
DROP FUNCTION IF EXISTS register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT);

-- ユーザー登録関数を作成
CREATE OR REPLACE FUNCTION register_new_user(
  p_user_id TEXT,
  p_user_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT
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
BEGIN
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
  -- Note: この操作はSECURITY DEFINER権限で実行されます
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

  -- usersテーブルにユーザー情報を登録
  INSERT INTO users (
    id,
    user_id,
    name,
    role,
    auth_user_id,
    is_active
  ) VALUES (
    v_auth_user_id,
    p_user_id,
    p_user_name,
    p_role,
    v_auth_user_id,
    true
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

-- 関数の実行権限を設定
GRANT EXECUTE ON FUNCTION register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- 関数の説明
COMMENT ON FUNCTION register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'フロントエンドから呼び出し可能なユーザー登録関数';
