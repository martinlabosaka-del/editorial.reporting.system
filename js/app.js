// ========================================
// アプリケーション メイン処理
// ========================================

// 画面状態
let currentScreen = 'menu';

/**
 * 現在の画面状態を保存
 */
function saveCurrentScreen(screenName, params = null) {
  currentScreen = screenName;
  localStorage.setItem('currentScreen', screenName);
  if (params) {
    localStorage.setItem('currentScreenParams', JSON.stringify(params));
  } else {
    localStorage.removeItem('currentScreenParams');
  }
}

/**
 * 保存された画面状態を復元
 */
async function restoreScreen() {
  const savedScreen = localStorage.getItem('currentScreen');
  const savedParams = localStorage.getItem('currentScreenParams');

  if (!savedScreen || savedScreen === 'menu') {
    showDashboard();
    return;
  }

  try {
    const params = savedParams ? JSON.parse(savedParams) : null;

    switch (savedScreen) {
      case 'dashboard':
        showDashboard();
        break;
      case 'project-registration':
        showProjectRegistration();
        break;
      case 'project-search':
        showProjectSearch();
        break;
      case 'project-detail':
        if (params && params.projectId) {
          showProjectDetail(params.projectId);
        } else {
          showDashboard();
        }
        break;
      case 'project-edit':
        if (params && params.projectId) {
          showProjectEditScreen(params.projectId);
        } else {
          showDashboard();
        }
        break;
      case 'edit-time-registration':
        showEditTimeRegistration();
        break;
      case 'approval-search':
        showApprovalSearch();
        break;
      case 'approval-detail':
        if (params && params.projectId) {
          showApprovalDetail(params.projectId);
        } else {
          showDashboard();
        }
        break;
      case 'admin':
        showAdminScreen();
        break;
      case 'timeline':
        showTimeline();
        break;
      default:
        showDashboard();
    }
  } catch (error) {
    console.error('画面復元エラー:', error);
    showDashboard();
  }
}

/**
 * アプリケーション初期化
 */
async function initApp() {
  // Supabaseセッション確認
  const result = await checkSession();
  if (result.success) {
    showMainScreen();
  } else {
    showLoginScreen();
  }
}

/**
 * メニュー画面表示（ダッシュボードにリダイレクト）
 */
function showMenu() {
  showDashboard();
}

/**
 * すべての画面を非表示
 */
function hideAllScreens() {
  const screens = [
    'menu-screen',
    'dashboard-screen',
    'project-registration-screen',
    'project-search-screen',
    'project-detail-screen',
    'project-edit-screen',
    'edit-time-registration-screen',
    'approval-search-screen',
    'approval-detail-screen',
    'admin-screen',
    'timeline-screen'
  ];

  screens.forEach(screenId => {
    const element = document.getElementById(screenId);
    if (element) {
      element.classList.add('hidden');
    }
  });
}

/**
 * 戻るボタン表示
 */
function createBackButton(onclick) {
  return `<button class="btn btn-secondary" onclick="${onclick}">戻る</button>`;
}

/**
 * メッセージ表示
 */
function showMessage(elementId, message, type = 'success') {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="message ${type}">${message}</div>`;
    setTimeout(() => {
      element.innerHTML = '';
    }, 5000);
  }
}

/**
 * メニュー表示（権限別）
 */
function displayMenu(containerId) {
  const user = getCurrentUser();
  if (!user) return;

  let menus = [];

  if (user.role === 'part_time') {
    // アルバイト：編集時間登録と分析のみ
    menus = [
      {
        title: '編集時間登録',
        desc: 'サブ編集者として登録されている進行中案件の時間を記録',
        action: 'showEditTimeRegistration()'
      }
    ];
    // 管理者の場合は管理画面メニューを追加
    if (user.is_admin) {
      menus.push({
        title: '管理画面',
        desc: 'ユーザー管理',
        action: 'showAdminScreen()'
      });
    }
    menus.push({
      title: '分析',
      desc: '統計・分析（未実装）',
      action: 'showAnalysis()'
    });
  } else if (user.role === 'staff') {
    // 編集者：案件登録・編集・申請・フィードバック・検索・分析
    menus = [
      {
        title: '案件登録',
        desc: '新規案件を登録',
        action: 'showProjectRegistration()'
      },
      {
        title: '案件詳細登録',
        desc: '進行中・差戻案件を編集',
        action: 'showProjectEditList()'
      },
      {
        title: '編集時間登録',
        desc: 'メイン/サブ編集者として登録されている進行中案件の時間を記録',
        action: 'showEditTimeRegistration()'
      },
      {
        title: '申請',
        desc: 'メイン編集者の案件を申請',
        action: 'showProjectSubmitList()'
      },
      {
        title: '上長からのフィードバック',
        desc: '過去2ヶ月の承認済案件を確認',
        action: 'showFeedbackList()'
      },
      {
        title: '案件検索',
        desc: '全案件を検索（詳細表示のみ）',
        action: 'showProjectSearch()'
      },
      {
        title: '案件タイムライン',
        desc: '進行中案件のマイルストーンをタイムラインで表示',
        action: 'showTimeline()'
      }
    ];
    // 管理者の場合は管理画面メニューを追加
    if (user.is_admin) {
      menus.push({
        title: '管理画面',
        desc: 'ユーザー管理',
        action: 'showAdminScreen()'
      });
    }
  } else if (user.role === 'leader') {
    // リーダー：staff機能 + 承認機能
    menus = [
      {
        title: '案件登録',
        desc: '新規案件を登録',
        action: 'showProjectRegistration()'
      },
      {
        title: '案件詳細登録',
        desc: '進行中・差戻案件を編集',
        action: 'showProjectEditList()'
      },
      {
        title: '編集時間登録',
        desc: '進行中の全案件の時間を記録',
        action: 'showEditTimeRegistration()'
      },
      {
        title: '申請',
        desc: 'メイン編集者の案件を申請',
        action: 'showProjectSubmitList()'
      },
      {
        title: '上長からのフィードバック',
        desc: '過去2ヶ月の承認済案件を確認',
        action: 'showFeedbackList()'
      },
      {
        title: '承認',
        desc: '申請された全案件を承認',
        action: 'showApprovalSearch()'
      },
      {
        title: '案件検索',
        desc: '全案件を検索（statusに応じた詳細画面表示）',
        action: 'showProjectSearch()'
      },
      {
        title: '案件タイムライン',
        desc: '進行中案件のマイルストーンをタイムラインで表示',
        action: 'showTimeline()'
      }
    ];
    // 管理者の場合は管理画面メニューを追加
    if (user.is_admin) {
      menus.push({
        title: '管理画面',
        desc: 'ユーザー管理',
        action: 'showAdminScreen()'
      });
    }
  } else if (user.role === 'executive') {
    // 役員：検索と分析のみ
    menus = [
      {
        title: '案件検索',
        desc: '全案件を検索（statusに応じた詳細画面表示）',
        action: 'showProjectSearch()'
      },
      {
        title: '案件タイムライン',
        desc: '進行中案件のマイルストーンをタイムラインで表示',
        action: 'showTimeline()'
      }
    ];
    // 管理者の場合は管理画面メニューを追加
    if (user.is_admin) {
      menus.push({
        title: '管理画面',
        desc: 'ユーザー管理',
        action: 'showAdminScreen()'
      });
    }
    menus.push({
      title: '分析',
      desc: '統計・分析（未実装）',
      action: 'showAnalysis()'
    });
  }

  // メニューHTML生成
  const menuGrid = document.getElementById(containerId);
  if (!menuGrid) return;

  menuGrid.innerHTML = '';

  menus.forEach(menu => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.innerHTML = `<h3>${menu.title}</h3><p>${menu.desc}</p>`;
    item.onclick = function() {
      eval(menu.action);
    };
    menuGrid.appendChild(item);
  });
}

// ページ読み込み時に初期化
window.addEventListener('DOMContentLoaded', initApp);
