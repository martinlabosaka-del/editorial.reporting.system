// ========================================
// 認証処理
// ========================================

/**
 * ログイン処理
 */
async function handleLogin() {
  const email = document.getElementById('login-user-id').value;
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('login-remember-me').checked;

  if (!email || !password) {
    showLoginMessage('メールアドレスとパスワードを入力してください', 'error');
    return;
  }

  const result = await login(email, password, rememberMe);

  if (result.success) {
    showMainScreen();
  } else {
    showLoginMessage(result.message, 'error');
  }
}

/**
 * ログアウト処理
 */
async function handleLogout() {
  const confirmed = confirm('ログアウトしますか?');
  if (!confirmed) return;

  await logout();
  showLoginScreen();
}

/**
 * ログインメッセージ表示
 */
function showLoginMessage(message, type) {
  const messageDiv = document.getElementById('login-message');
  messageDiv.innerHTML = `<div class="message ${type}">${message}</div>`;
}

/**
 * ログイン画面表示
 */
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('login-user-id').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-remember-me').checked = false;
  document.getElementById('login-message').innerHTML = '';
}

/**
 * メイン画面表示
 */
function showMainScreen() {
  const user = getCurrentUser();
  if (!user) {
    showLoginScreen();
    return;
  }

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.remove('hidden');
  document.getElementById('user-name-display').textContent = `${user.name} (${getRoleLabel(user.role)})`;

  // 保存された画面状態を復元（なければダッシュボード表示）
  restoreScreen();
}

/**
 * 権限ラベル取得
 */
function getRoleLabel(role) {
  const labels = {
    'part_time': 'アルバイト',
    'staff': 'スタッフ',
    'leader': 'リーダー',
    'executive': '役員'
  };
  return labels[role] || role;
}
