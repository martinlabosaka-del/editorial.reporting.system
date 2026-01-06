// ========================================
// Supabase Client
// ========================================

// Supabaseクライアントの初期化
let supabaseClient;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase JS library is not loaded');
    return;
  }

  // config.jsから設定を読み込む
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error('Supabase configuration not found in config.js');
    return;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  // グローバル変数として公開
  window.supabase = supabaseClient;

  console.log('Supabase client initialized');
}

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}

// ========================================
// 認証ヘルパー関数
// ========================================

/**
 * 現在の認証セッションを取得
 */
async function getSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Get session error:', error);
    return null;
  }
  return session;
}

/**
 * 現在のユーザーを取得
 */
async function getCurrentAuthUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error('Get user error:', error);
    return null;
  }
  return user;
}

/**
 * ログイン状態を確認
 */
async function checkAuthStatus() {
  const session = await getSession();
  return session !== null;
}

// ========================================
// データベースヘルパー関数
// ========================================

/**
 * ユーザー情報をauth_user_idから取得
 */
async function getUserByAuthId(authUserId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    console.error('Get user by auth_user_id error:', error);
    return null;
  }

  return data;
}
