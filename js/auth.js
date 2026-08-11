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
  document.getElementById('forgot-password-screen').classList.add('hidden');
  document.getElementById('reset-password-screen').classList.add('hidden');
  document.getElementById('login-user-id').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-remember-me').checked = false;
  document.getElementById('login-message').innerHTML = '';
}

// ========================================
// パスワード再設定
// ========================================

/**
 * パスワード再設定リクエスト画面を表示
 */
function showForgotPasswordScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('reset-password-screen').classList.add('hidden');
  document.getElementById('forgot-password-screen').classList.remove('hidden');

  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-password-message').innerHTML = '';
}

/**
 * 新しいパスワードの設定画面を表示
 * （メールのリンクから戻ってきたときに app.js の initApp から呼ばれる）
 */
function showResetPasswordScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('forgot-password-screen').classList.add('hidden');
  document.getElementById('reset-password-screen').classList.remove('hidden');

  document.getElementById('reset-password-new').value = '';
  document.getElementById('reset-password-confirm').value = '';
  document.getElementById('reset-password-screen-message').innerHTML = '';
}

/**
 * ログイン画面に戻る
 */
function backToLoginScreen() {
  showLoginScreen();
}

/**
 * 再設定用リンクの送信先URLを組み立てる
 * クエリとハッシュを除いた現在のページのURLを使う。
 * このURLは Supabase の Authentication > URL Configuration >
 * Redirect URLs に登録されている必要がある。
 */
function getPasswordResetRedirectUrl() {
  return window.location.origin + window.location.pathname;
}

/**
 * パスワード再設定メールの送信
 */
async function handleForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();

  if (!email) {
    showForgotPasswordMessage('メールアドレスを入力してください', 'error');
    return;
  }

  showForgotPasswordMessage('送信中...', 'success');

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl()
    });

    if (error) {
      console.error('resetPasswordForEmail error:', error);
      showForgotPasswordMessage(
        'メールの送信に失敗しました。時間をおいて再度お試しいただくか、管理者にご連絡ください。',
        'error'
      );
      return;
    }

    // 登録の有無を問わず同じ文面を返す
    // （どのメールアドレスが登録済みかを外部に知らせないため）
    showForgotPasswordMessage(
      'ご登録のメールアドレス宛に再設定用のリンクを送信しました。メールをご確認ください。',
      'success'
    );
  } catch (error) {
    console.error('handleForgotPassword error:', error);
    showForgotPasswordMessage('メールの送信に失敗しました', 'error');
  }
}

/**
 * 新しいパスワードを設定
 */
async function handleSetNewPassword() {
  const newPassword = document.getElementById('reset-password-new').value;
  const confirmPassword = document.getElementById('reset-password-confirm').value;

  if (!newPassword || !confirmPassword) {
    showResetPasswordScreenMessage('新しいパスワードを入力してください', 'error');
    return;
  }

  if (newPassword.length < 8) {
    showResetPasswordScreenMessage('パスワードは8文字以上で入力してください', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showResetPasswordScreenMessage('パスワードが一致しません', 'error');
    return;
  }

  showResetPasswordScreenMessage('設定中...', 'success');

  try {
    // メールのリンク経由で一時的なセッションが確立されている必要がある。
    // URLのハッシュからセッションを復元する処理は非同期のため、
    // 画面表示直後に送信された場合は完了していないことがある。一度だけ待ち直す。
    let { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData || !sessionData.session) {
      await new Promise(resolve => setTimeout(resolve, 800));
      ({ data: sessionData } = await supabase.auth.getSession());
    }

    if (!sessionData || !sessionData.session) {
      showResetPasswordScreenMessage(
        'リンクの有効期限が切れています。お手数ですが、もう一度最初からやり直してください。',
        'error'
      );
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('updateUser error:', error);
      showResetPasswordScreenMessage(
        'パスワードの設定に失敗しました: ' + error.message,
        'error'
      );
      return;
    }

    showResetPasswordScreenMessage(
      'パスワードを変更しました。新しいパスワードでログインしてください。',
      'success'
    );

    // 一時セッションを破棄してログイン画面へ戻す
    setTimeout(async () => {
      await logout();
      showLoginScreen();
    }, 2500);
  } catch (error) {
    console.error('handleSetNewPassword error:', error);
    showResetPasswordScreenMessage('パスワードの設定に失敗しました', 'error');
  }
}

function showForgotPasswordMessage(message, type) {
  document.getElementById('forgot-password-message').innerHTML =
    `<div class="message ${type}">${escapeHtml(message)}</div>`;
}

function showResetPasswordScreenMessage(message, type) {
  document.getElementById('reset-password-screen-message').innerHTML =
    `<div class="message ${type}">${escapeHtml(message)}</div>`;
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
