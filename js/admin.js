// ========================================
// 管理画面
// ========================================

// 管理画面用のマスタデータキャッシュ
let adminMasterData = {
  affiliations: [],
  teams: []
};

/**
 * 管理画面用マスタデータ読み込み
 */
async function loadAdminMasterData() {
  const [affiliations, teams] = await Promise.all([
    getAffiliations(),
    getTeams()
  ]);

  if (affiliations.success) adminMasterData.affiliations = affiliations.data;
  if (teams.success) adminMasterData.teams = teams.data;
}

/**
 * 管理画面表示
 */
async function showAdminScreen() {
  const user = getCurrentUser();

  // 管理者チェック
  if (!user || !user.is_admin) {
    alert('管理者権限が必要です');
    showDashboard();
    return;
  }

  hideAllScreens();
  const screen = document.getElementById('admin-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('admin');

  showLoading('admin-screen');

  // マスタデータとユーザー一覧を並行取得
  await loadAdminMasterData();
  const result = await getAllUsers();

  if (!result.success) {
    showError('admin-screen', result.message);
    return;
  }

  const users = result.data || [];

  const roleLabels = {
    'part_time': 'アルバイト',
    'staff': 'スタッフ',
    'leader': 'リーダー',
    'executive': '役員'
  };

  // 所属・チームのセレクトオプション生成
  const affiliationOptions = adminMasterData.affiliations.map(a =>
    `<option value="${a.id}">${escapeHtml(a.affiliation_name)}</option>`
  ).join('');

  const teamOptions = adminMasterData.teams.map(t =>
    `<option value="${t.id}">${escapeHtml(t.team_name)}</option>`
  ).join('');

  const html = `
    <div class="card">
      <h2>ユーザー管理</h2>
      ${createBackButton('showDashboard()')}

      <div style="margin-bottom: 20px; display: flex; gap: 10px;">
        <button class="btn btn-primary" onclick="showAddUserModal()">+ 新規ユーザー追加</button>
        <button class="btn btn-secondary" onclick="showMasterManagement()">所属・チーム管理</button>
      </div>

      <div style="overflow-x: auto;">
        <table class="results-table">
          <thead>
            <tr>
              <th>ユーザーID</th>
              <th>名前</th>
              <th>所属</th>
              <th>チーム</th>
              <th>権限</th>
              <th>編集者</th>
              <th>管理者</th>
              <th>ステータス</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${escapeHtml(u.user_id)}</td>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.affiliation_name || '-')}</td>
                <td>${escapeHtml(u.team_name || '-')}</td>
                <td>${roleLabels[u.role] || u.role}</td>
                <td>${u.is_editor ? '✓' : ''}</td>
                <td>${u.is_admin ? '✓' : ''}</td>
                <td>
                  <span class="status-badge ${u.is_active ? 'status-active' : 'status-inactive'}">
                    ${u.is_active ? '有効' : '無効'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="showEditUserModal('${u.user_id}')">編集</button>
                  <button class="btn btn-secondary btn-sm" onclick="showResetPasswordModal('${u.user_id}')">パスワード</button>
                  ${!u.is_admin || u.user_id !== user.user_id ?
                    `<button class="btn btn-danger btn-sm" onclick="confirmDeleteUser('${u.user_id}')">無効化</button>` :
                    ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ユーザー追加モーダル -->
    <div id="add-user-modal" class="modal" style="display: none;">
      <div class="modal-content">
        <span class="close" onclick="closeAddUserModal()">&times;</span>
        <h2>新規ユーザー追加</h2>
        <form id="add-user-form">
          <div class="form-group">
            <label>ユーザーID <span style="color: red;">*</span></label>
            <input type="text" id="new-user-id" required>
          </div>
          <div class="form-group">
            <label>名前 <span style="color: red;">*</span></label>
            <input type="text" id="new-user-name" required>
          </div>
          <div class="form-group">
            <label>メールアドレス <span style="color: red;">*</span></label>
            <input type="email" id="new-user-email" required>
          </div>
          <div class="form-group">
            <label>パスワード <span style="color: red;">*</span></label>
            <input type="password" id="new-user-password" required>
          </div>
          <div class="form-group">
            <label>権限 <span style="color: red;">*</span></label>
            <select id="new-user-role" required>
              <option value="part_time">アルバイト</option>
              <option value="staff">スタッフ</option>
              <option value="leader">リーダー</option>
              <option value="executive">役員</option>
            </select>
          </div>
          <div class="form-group">
            <label>所属</label>
            <select id="new-user-affiliation">
              <option value="">選択してください</option>
              ${affiliationOptions}
            </select>
          </div>
          <div class="form-group">
            <label>チーム</label>
            <select id="new-user-team">
              <option value="">選択してください</option>
              ${teamOptions}
            </select>
          </div>
          <div class="form-group">
            <div class="checkbox-group" onclick="document.getElementById('new-user-is-editor').click(); event.stopPropagation();">
              <input type="checkbox" id="new-user-is-editor" onclick="event.stopPropagation();">
              <label for="new-user-is-editor">動画編集者（メイン/サブ編集者、ディレクターとして選択可能）</label>
            </div>
          </div>
          <div class="form-group">
            <div class="checkbox-group" onclick="document.getElementById('new-user-is-admin').click(); event.stopPropagation();">
              <input type="checkbox" id="new-user-is-admin" onclick="event.stopPropagation();">
              <label for="new-user-is-admin">管理者権限を付与</label>
            </div>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-secondary" onclick="closeAddUserModal()">キャンセル</button>
            <button type="submit" class="btn btn-primary">追加</button>
          </div>
          <div id="add-user-message"></div>
        </form>
      </div>
    </div>

    <!-- ユーザー編集モーダル -->
    <div id="edit-user-modal" class="modal" style="display: none;">
      <div class="modal-content">
        <span class="close" onclick="closeEditUserModal()">&times;</span>
        <h2>ユーザー編集</h2>
        <form id="edit-user-form">
          <input type="hidden" id="edit-user-id">
          <div class="form-group">
            <label>ユーザーID</label>
            <input type="text" id="edit-user-id-display" disabled style="background: #f0f0f0;">
          </div>
          <div class="form-group">
            <label>名前 <span style="color: red;">*</span></label>
            <input type="text" id="edit-user-name" required>
          </div>
          <div class="form-group">
            <label>権限 <span style="color: red;">*</span></label>
            <select id="edit-user-role" required>
              <option value="part_time">アルバイト</option>
              <option value="staff">スタッフ</option>
              <option value="leader">リーダー</option>
              <option value="executive">役員</option>
            </select>
          </div>
          <div class="form-group">
            <label>所属</label>
            <select id="edit-user-affiliation">
              <option value="">選択してください</option>
              ${affiliationOptions}
            </select>
          </div>
          <div class="form-group">
            <label>チーム</label>
            <select id="edit-user-team">
              <option value="">選択してください</option>
              ${teamOptions}
            </select>
          </div>
          <div class="form-group">
            <div class="checkbox-group" onclick="document.getElementById('edit-user-is-editor').click(); event.stopPropagation();">
              <input type="checkbox" id="edit-user-is-editor" onclick="event.stopPropagation();">
              <label for="edit-user-is-editor">動画編集者（メイン/サブ編集者、ディレクターとして選択可能）</label>
            </div>
          </div>
          <div class="form-group">
            <div class="checkbox-group" onclick="document.getElementById('edit-user-is-admin').click(); event.stopPropagation();">
              <input type="checkbox" id="edit-user-is-admin" onclick="event.stopPropagation();">
              <label for="edit-user-is-admin">管理者権限を付与</label>
            </div>
          </div>
          <div class="form-group">
            <div class="checkbox-group" onclick="document.getElementById('edit-user-is-active').click(); event.stopPropagation();">
              <input type="checkbox" id="edit-user-is-active" onclick="event.stopPropagation();">
              <label for="edit-user-is-active">有効</label>
            </div>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-secondary" onclick="closeEditUserModal()">キャンセル</button>
            <button type="submit" class="btn btn-primary">更新</button>
          </div>
          <div id="edit-user-message"></div>
        </form>
      </div>
    </div>

    <!-- パスワードリセットモーダル -->
    <div id="reset-password-modal" class="modal" style="display: none;">
      <div class="modal-content">
        <span class="close" onclick="closeResetPasswordModal()">&times;</span>
        <h2>パスワードリセット</h2>
        <form id="reset-password-form">
          <input type="hidden" id="reset-user-id">
          <div class="form-group">
            <label>ユーザーID</label>
            <input type="text" id="reset-user-id-display" disabled style="background: #f0f0f0;">
          </div>
          <div class="form-group">
            <label>新しいパスワード <span style="color: red;">*</span></label>
            <input type="password" id="reset-new-password" required>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-secondary" onclick="closeResetPasswordModal()">キャンセル</button>
            <button type="submit" class="btn btn-primary">リセット</button>
          </div>
          <div id="reset-password-message"></div>
        </form>
      </div>
    </div>

    <!-- 所属・チーム管理モーダル -->
    <div id="master-management-modal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 700px;">
        <span class="close" onclick="closeMasterManagement()">&times;</span>
        <h2>所属・チーム管理</h2>

        <!-- 所属管理 -->
        <h3 style="margin-top: 20px; margin-bottom: 10px;">所属一覧</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <input type="text" id="new-affiliation-name" placeholder="新しい所属名" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <button type="button" class="btn btn-primary" onclick="handleAddAffiliation()">追加</button>
        </div>
        <div id="affiliation-list">
          ${adminMasterData.affiliations.length > 0 ?
            `<table class="results-table" style="margin-top: 0;">
              <thead><tr><th>所属名</th></tr></thead>
              <tbody>
                ${adminMasterData.affiliations.map(a => `
                  <tr><td>${escapeHtml(a.affiliation_name)}</td></tr>
                `).join('')}
              </tbody>
            </table>` :
            '<p style="color: #999;">所属が登録されていません</p>'
          }
        </div>

        <!-- チーム管理 -->
        <h3 style="margin-top: 25px; margin-bottom: 10px;">チーム一覧</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <input type="text" id="new-team-name" placeholder="新しいチーム名" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <button type="button" class="btn btn-primary" onclick="handleAddTeam()">追加</button>
        </div>
        <div id="team-list">
          ${adminMasterData.teams.length > 0 ?
            `<table class="results-table" style="margin-top: 0;">
              <thead><tr><th>チーム名</th></tr></thead>
              <tbody>
                ${adminMasterData.teams.map(t => `
                  <tr><td>${escapeHtml(t.team_name)}</td></tr>
                `).join('')}
              </tbody>
            </table>` :
            '<p style="color: #999;">チームが登録されていません</p>'
          }
        </div>

        <div class="btn-group" style="margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="closeMasterManagement()">閉じる</button>
        </div>
        <div id="master-management-message"></div>
      </div>
    </div>
  `;

  screen.innerHTML = html;

  // フォーム送信イベント
  document.getElementById('add-user-form').onsubmit = handleAddUser;
  document.getElementById('edit-user-form').onsubmit = handleEditUser;
  document.getElementById('reset-password-form').onsubmit = handleResetPassword;
}

/**
 * 所属・チーム管理モーダル表示
 */
function showMasterManagement() {
  document.getElementById('master-management-modal').style.display = 'block';
  document.getElementById('master-management-message').innerHTML = '';
}

/**
 * 所属・チーム管理モーダル閉じる
 */
function closeMasterManagement() {
  document.getElementById('master-management-modal').style.display = 'none';
}

/**
 * 所属追加処理
 */
async function handleAddAffiliation() {
  const name = document.getElementById('new-affiliation-name').value.trim();
  if (!name) {
    showMessage('master-management-message', '所属名を入力してください', 'error');
    return;
  }

  showMessage('master-management-message', '追加中...', 'success');
  const result = await addAffiliation(name);

  if (result.success) {
    showMessage('master-management-message', result.message, 'success');
    document.getElementById('new-affiliation-name').value = '';
    // 画面を再読み込みして反映
    setTimeout(() => {
      closeMasterManagement();
      showAdminScreen();
    }, 1000);
  } else {
    showMessage('master-management-message', result.message, 'error');
  }
}

/**
 * チーム追加処理
 */
async function handleAddTeam() {
  const name = document.getElementById('new-team-name').value.trim();
  if (!name) {
    showMessage('master-management-message', 'チーム名を入力してください', 'error');
    return;
  }

  showMessage('master-management-message', '追加中...', 'success');
  const result = await addTeam(name);

  if (result.success) {
    showMessage('master-management-message', result.message, 'success');
    document.getElementById('new-team-name').value = '';
    setTimeout(() => {
      closeMasterManagement();
      showAdminScreen();
    }, 1000);
  } else {
    showMessage('master-management-message', result.message, 'error');
  }
}

/**
 * ユーザー追加モーダル表示
 */
function showAddUserModal() {
  document.getElementById('add-user-modal').style.display = 'block';
  document.getElementById('add-user-form').reset();
  document.getElementById('add-user-message').innerHTML = '';
}

/**
 * ユーザー追加モーダル閉じる
 */
function closeAddUserModal() {
  document.getElementById('add-user-modal').style.display = 'none';
}

/**
 * ユーザー追加処理
 */
async function handleAddUser(e) {
  e.preventDefault();

  const userData = {
    user_id: document.getElementById('new-user-id').value,
    name: document.getElementById('new-user-name').value,
    email: document.getElementById('new-user-email').value,
    password: document.getElementById('new-user-password').value,
    role: document.getElementById('new-user-role').value,
    is_editor: document.getElementById('new-user-is-editor').checked,
    is_admin: document.getElementById('new-user-is-admin').checked
  };

  const affiliationId = document.getElementById('new-user-affiliation').value;
  const teamId = document.getElementById('new-user-team').value;

  showMessage('add-user-message', '登録中...', 'success');

  const result = await addUser(userData);

  if (result.success) {
    // ユーザー登録後に所属・チームを更新
    if (affiliationId || teamId) {
      await updateUser(userData.user_id, {
        name: userData.name,
        role: userData.role,
        is_editor: userData.is_editor,
        is_admin: userData.is_admin,
        is_active: true,
        affiliation_id: affiliationId || null,
        team_id: teamId || null
      });
    }

    showMessage('add-user-message', result.message, 'success');
    setTimeout(() => {
      closeAddUserModal();
      showAdminScreen();
    }, 1500);
  } else {
    showMessage('add-user-message', result.message, 'error');
  }
}

/**
 * ユーザー編集モーダル表示
 */
async function showEditUserModal(userId) {
  const result = await getAllUsers();
  if (!result.success) {
    alert('ユーザー情報の取得に失敗しました');
    return;
  }

  const user = result.data.find(u => u.user_id === userId);
  if (!user) {
    alert('ユーザーが見つかりません');
    return;
  }

  document.getElementById('edit-user-id').value = user.user_id;
  document.getElementById('edit-user-id-display').value = user.user_id;
  document.getElementById('edit-user-name').value = user.name;
  document.getElementById('edit-user-role').value = user.role;
  document.getElementById('edit-user-affiliation').value = user.affiliation_id || '';
  document.getElementById('edit-user-team').value = user.team_id || '';
  document.getElementById('edit-user-is-editor').checked = user.is_editor || false;
  document.getElementById('edit-user-is-admin').checked = user.is_admin;
  document.getElementById('edit-user-is-active').checked = user.is_active;
  document.getElementById('edit-user-message').innerHTML = '';

  document.getElementById('edit-user-modal').style.display = 'block';
}

/**
 * ユーザー編集モーダル閉じる
 */
function closeEditUserModal() {
  document.getElementById('edit-user-modal').style.display = 'none';
}

/**
 * ユーザー編集処理
 */
async function handleEditUser(e) {
  e.preventDefault();

  const userId = document.getElementById('edit-user-id').value;
  const userData = {
    name: document.getElementById('edit-user-name').value,
    role: document.getElementById('edit-user-role').value,
    is_editor: document.getElementById('edit-user-is-editor').checked,
    is_admin: document.getElementById('edit-user-is-admin').checked,
    is_active: document.getElementById('edit-user-is-active').checked,
    affiliation_id: document.getElementById('edit-user-affiliation').value || null,
    team_id: document.getElementById('edit-user-team').value || null
  };

  showMessage('edit-user-message', '更新中...', 'success');

  const result = await updateUser(userId, userData);

  if (result.success) {
    showMessage('edit-user-message', result.message, 'success');
    setTimeout(() => {
      closeEditUserModal();
      showAdminScreen();
    }, 1500);
  } else {
    showMessage('edit-user-message', result.message, 'error');
  }
}

/**
 * パスワードリセットモーダル表示
 */
function showResetPasswordModal(userId) {
  document.getElementById('reset-user-id').value = userId;
  document.getElementById('reset-user-id-display').value = userId;
  document.getElementById('reset-new-password').value = '';
  document.getElementById('reset-password-message').innerHTML = '';
  document.getElementById('reset-password-modal').style.display = 'block';
}

/**
 * パスワードリセットモーダル閉じる
 */
function closeResetPasswordModal() {
  document.getElementById('reset-password-modal').style.display = 'none';
}

/**
 * パスワードリセット処理
 */
async function handleResetPassword(e) {
  e.preventDefault();

  const userId = document.getElementById('reset-user-id').value;
  const newPassword = document.getElementById('reset-new-password').value;

  showMessage('reset-password-message', 'リセット中...', 'success');

  const result = await resetUserPassword(userId, newPassword);

  if (result.success) {
    showMessage('reset-password-message', result.message, 'success');
    setTimeout(() => {
      closeResetPasswordModal();
    }, 1500);
  } else {
    showMessage('reset-password-message', result.message, 'error');
  }
}

/**
 * ユーザー削除確認
 */
function confirmDeleteUser(userId) {
  if (confirm(`ユーザー「${userId}」を無効化しますか？`)) {
    handleDeleteUser(userId);
  }
}

/**
 * ユーザー削除処理
 */
async function handleDeleteUser(userId) {
  const result = await deleteUser(userId);

  if (result.success) {
    alert(result.message);
    showAdminScreen();
  } else {
    alert(result.message);
  }
}
