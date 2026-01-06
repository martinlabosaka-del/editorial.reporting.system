// ========================================
// API通信モジュール
// ========================================

// 設定はconfig.jsから読み込まれます
// API_BASE_URLとSTORAGE_KEYSはconfig.jsで定義されています

/**
 * APIリクエストを送信
 * @param {string} action - アクション名
 * @param {object} params - パラメータ
 * @returns {Promise<object>} - レスポンス
 */
async function apiRequest(action, params = {}) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: action,
        params: params
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('API Request Error:', error);
    return {
      success: false,
      message: 'API通信エラー: ' + error.message
    };
  }
}

// ========================================
// 認証API
// ========================================

/**
 * ログイン
 */
async function login(loginId, password, rememberMe = false) {
  const result = await apiRequest('authenticate', {
    loginId,
    password,
    rememberMe
  });

  if (result.success) {
    // ユーザー情報を保存
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));

    // トークンを保存(remember meの場合)
    if (result.token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, result.token);
    }
  }

  return result;
}

/**
 * トークンで自動ログイン
 */
async function loginWithToken() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

  if (!token) {
    return { success: false, message: 'トークンがありません' };
  }

  const result = await apiRequest('authenticateWithToken', { token });

  if (result.success) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
  } else {
    // トークンが無効な場合は削除
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }

  return result;
}

/**
 * ログアウト
 */
async function logout() {
  const result = await apiRequest('logout');

  // ローカルストレージをクリア
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);

  return result;
}

/**
 * 現在のユーザー情報を取得
 */
function getCurrentUser() {
  const userJson = localStorage.getItem(STORAGE_KEYS.USER);
  return userJson ? JSON.parse(userJson) : null;
}

// ========================================
// マスタデータAPI
// ========================================

async function getUsers(roleFilter = null) {
  return await apiRequest('getUsers', { roleFilter });
}

async function getClients() {
  return await apiRequest('getClients');
}

async function getGenres() {
  return await apiRequest('getGenres');
}

async function getTechnologies() {
  return await apiRequest('getTechnologies');
}

async function getEstimateItems() {
  return await apiRequest('getEstimateItems');
}

async function getEditItems() {
  return await apiRequest('getEditItems');
}

async function getAffiliations() {
  return await apiRequest('getAffiliations');
}

// ========================================
// クライアント管理API
// ========================================

async function addClient(clientName, agencyName) {
  return await apiRequest('addClient', { clientName, agencyName });
}

// ========================================
// プロジェクト管理API
// ========================================

async function saveProject(projectData) {
  return await apiRequest('saveProject', { projectData });
}

async function updateProject(projectData) {
  return await apiRequest('updateProject', { projectData });
}

async function submitProjectUpdate(projectData) {
  return await apiRequest('submitProjectUpdate', { projectData });
}

async function searchProjects(searchParams) {
  return await apiRequest('searchProjects', { searchParams });
}

async function getProjectDetail(projectId) {
  return await apiRequest('getProjectDetail', { projectId });
}

async function getInProgressProjects() {
  return await apiRequest('getInProgressProjects');
}

// ========================================
// 編集時間登録API
// ========================================

async function saveEditTime(editTimeData) {
  return await apiRequest('saveEditTime', { editTimeData });
}

// ========================================
// メモ保存API
// ========================================

async function saveProjectMemo(memoData) {
  return await apiRequest('saveProjectMemo', { memoData });
}

// ========================================
// ダッシュボードAPI
// ========================================

async function getDashboardData(userId) {
  return await apiRequest('getDashboardData', { userId });
}

// ========================================
// 承認関連API
// ========================================

async function searchApprovalProjects(criteria) {
  return await apiRequest('searchApprovalProjects', { criteria });
}

async function getProjectForApproval(projectId) {
  return await apiRequest('getProjectForApproval', { projectId });
}

async function saveLeaderEvaluation(evaluationData) {
  return await apiRequest('saveLeaderEvaluation', { evaluationData });
}

async function approveProjectByLeader(evaluationData) {
  return await apiRequest('approveProjectByLeader', { evaluationData });
}

async function rejectProjectByLeader(data) {
  return await apiRequest('rejectProjectByLeader', { data });
}

async function withdrawProject(data) {
  return await apiRequest('withdrawProject', { data });
}

// ========================================
// 通知API
// ========================================

async function getNotifications(userId) {
  return await apiRequest('getNotifications', { userId });
}

// ========================================
// 見積内訳API
// ========================================

async function saveEstimateBreakdown(projectId, breakdown) {
  return await apiRequest('saveEstimateBreakdown', { projectId, breakdown });
}

// ========================================
// 案件申請関連API
// ========================================

async function saveProjectSubmitDraft(saveData) {
  return await apiRequest('saveProjectSubmitDraft', { saveData });
}

async function loadProjectSubmitList() {
  return await apiRequest('loadProjectSubmitList');
}

// ========================================
// フィードバック関連API
// ========================================

async function getFeedbackList() {
  return await apiRequest('getFeedbackList');
}
