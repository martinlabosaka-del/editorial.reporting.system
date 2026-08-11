// ========================================
// ダッシュボード画面
// ========================================

/**
 * ダッシュボード表示
 */
async function showDashboard() {
  hideAllScreens();
  const screen = document.getElementById('dashboard-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('dashboard');

  const user = getCurrentUser();
  if (!user) {
    showError('dashboard-screen', 'ユーザー情報が取得できません');
    return;
  }

  // マスタデータを読み込む（所属カラーコード取得のため）
  await loadMasterData();

  // ダッシュボードHTMLを構築
  const html = `
    <h2 class="section-title">ダッシュボード</h2>

    <!-- エラー報告リンク -->
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">⚠️</span>
      <div style="flex: 1;">
        <strong style="color: #856404;">テスト運用中</strong>
        <p style="margin: 4px 0 0 0; color: #856404; font-size: 14px;">
          エラーや不具合がありましたら、<a href="https://docs.google.com/spreadsheets/d/1jm3EFLoZp4mibMuhrkgfnWujqOl-ZCrBpwqmqfoK-Vc/edit?usp=sharing" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline; font-weight: bold;">こちらのスプレッドシート</a>に記入をお願いします。
        </p>
      </div>
    </div>

    <!-- サマリーカード -->
    <div id="dashboardSummary" class="dashboard-summary"></div>

    <!-- 時間カード（進行中・納品済） -->
    <div id="dashboardTimeCards" class="time-cards"></div>

    <!-- メニュー -->
    <h2 class="section-title">メニュー</h2>
    <div class="menu-grid" id="dashboard-menu-grid"></div>

    <!-- 差戻中案件一覧 -->
    <div id="rejectedProjectsSection" class="hidden">
      <h2 class="section-title" style="color: #ff6b6b;">差戻中の案件</h2>
      <div id="rejectedProjects">
        <div id="rejectedProjectCards" class="project-cards"></div>
      </div>
    </div>

    <!-- 進行中案件一覧 -->
    <h2 class="section-title">進行中の案件</h2>
    <div id="dashboardProjects">
      <div id="projectCards" class="project-cards"></div>
    </div>

    <!-- 承認申請案件一覧（リーダー以上のみ表示） -->
    <div id="pendingApprovalSection" class="hidden">
      <h2 class="section-title">承認申請案件一覧</h2>
      <div id="pendingApprovalProjects">
        <div id="approvalCards" class="project-cards"></div>
      </div>
    </div>
  `;

  screen.innerHTML = html;

  // メニューを表示
  displayMenu('dashboard-menu-grid');

  // ダッシュボードデータを読み込む
  loadDashboard(user);
}

/**
 * ダッシュボードデータ読み込み
 */
async function loadDashboard(user) {
  // 2026年の範囲を設定
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  console.log('=== ダッシュボードデータ取得開始 ===');
  console.log('対象期間:', yearStart, '〜', yearEnd);

  // 編集中の案件を取得（draft）
  const editingResult = await searchProjects({
    main_editor: user.user_id,
    status: 'draft',
    delivery_date_from: yearStart,
    delivery_date_to: yearEnd
  });

  // 申請中の案件を取得（submitted）
  const submittedResult = await searchProjects({
    main_editor: user.user_id,
    status: 'submitted',
    delivery_date_from: yearStart,
    delivery_date_to: yearEnd
  });

  // 差戻の案件を取得（rejected）
  const rejectedResult = await searchProjects({
    main_editor: user.user_id,
    status: 'rejected',
    delivery_date_from: yearStart,
    delivery_date_to: yearEnd
  });

  // 承認済の案件を取得（leader_approved, executive_approved）
  const approvedResult = await searchProjects({
    main_editor: user.user_id,
    status: ['leader_approved', 'executive_approved'],
    delivery_date_from: yearStart,
    delivery_date_to: yearEnd
  });

  // 納品済の案件を取得（actual_delivery_dateが入っている案件）
  const completedResult = await getCompletedProjects(user.user_id, yearStart, yearEnd);

  // 承認申請案件を取得（リーダー用）
  let pendingApprovalsResult = { success: true, data: [] };
  if (user.role === 'leader' || user.role === 'executive') {
    pendingApprovalsResult = await searchProjects({
      status: 'submitted',
      delivery_date_from: yearStart,
      delivery_date_to: yearEnd
    });
  }

  const dashboardData = {
    editing_count: editingResult.success ? editingResult.data.length : 0,
    completed_count: completedResult.success ? completedResult.data.length : 0,
    before_submit_count: editingResult.success ? editingResult.data.length : 0, // 申請前=編集中
    submitted_count: submittedResult.success ? submittedResult.data.length : 0,
    rejected_count: rejectedResult.success ? rejectedResult.data.length : 0,
    approved_count: approvedResult.success ? approvedResult.data.length : 0,
    rejected_projects: rejectedResult.success ? rejectedResult.data : [],
    projects: editingResult.success ? editingResult.data : [],
    pending_approvals: pendingApprovalsResult.success ? pendingApprovalsResult.data : []
  };

  console.log('=== ダッシュボードデータ ===', dashboardData);

  displayDashboard(dashboardData, user);
}

/**
 * ダッシュボード表示（権限別）
 */
function displayDashboard(data, user) {
  // 役員は何も表示しない（メニューのみ）
  if (user.role === 'executive') {
    const summaryContainer = document.getElementById('dashboardSummary');
    const timeCardsContainer = document.getElementById('dashboardTimeCards');
    if (summaryContainer) summaryContainer.innerHTML = '';
    if (timeCardsContainer) timeCardsContainer.innerHTML = '';
    document.getElementById('rejectedProjectsSection').classList.add('hidden');
    document.getElementById('dashboardProjects').classList.add('hidden');
    document.getElementById('pendingApprovalSection').classList.add('hidden');
    return;
  }

  // サマリーカード表示（案件数を横並びに）
  const summaryContainer = document.getElementById('dashboardSummary');
  if (summaryContainer) {
    summaryContainer.innerHTML = '';

    // 編集中カード
    const editingCard = document.createElement('div');
    editingCard.className = 'summary-card';
    editingCard.innerHTML =
      '<h3>編集中</h3>' +
      '<div class="number">' + (data.editing_count || 0) + '</div>';
    summaryContainer.appendChild(editingCard);

    // 納品済カード（今年分）
    const completedCard = document.createElement('div');
    completedCard.className = 'summary-card';
    completedCard.innerHTML =
      '<h3>納品済</h3>' +
      '<div class="number">' + (data.completed_count || 0) + '</div>';
    summaryContainer.appendChild(completedCard);
  }

  // 時間カード（申請前・申請中・差戻・承認済）
  const timeCardsContainer = document.getElementById('dashboardTimeCards');
  if (timeCardsContainer) {
    timeCardsContainer.innerHTML = '';

    // 申請前カード
    const beforeSubmitCard = document.createElement('div');
    beforeSubmitCard.className = 'summary-card';
    beforeSubmitCard.innerHTML =
      '<h3>申請前</h3>' +
      '<div class="number">' + (data.before_submit_count || 0) + '</div>';
    timeCardsContainer.appendChild(beforeSubmitCard);

    // 申請中カード
    const submittedCard = document.createElement('div');
    submittedCard.className = 'summary-card';
    submittedCard.innerHTML =
      '<h3>申請中</h3>' +
      '<div class="number">' + (data.submitted_count || 0) + '</div>';
    timeCardsContainer.appendChild(submittedCard);

    // 差戻カード
    const rejectedCard = document.createElement('div');
    rejectedCard.className = 'summary-card';
    rejectedCard.innerHTML =
      '<h3>差戻</h3>' +
      '<div class="number" style="color: #ff6b6b;">' + (data.rejected_count || 0) + '</div>';
    timeCardsContainer.appendChild(rejectedCard);

    // 承認済カード
    const approvedCard = document.createElement('div');
    approvedCard.className = 'summary-card';
    approvedCard.innerHTML =
      '<h3>承認済</h3>' +
      '<div class="number" style="color: #4CAF50;">' + (data.approved_count || 0) + '</div>';
    timeCardsContainer.appendChild(approvedCard);
  }

  // 差戻中の案件を表示（メイン編集者のみ）
  const rejectedProjects = data.rejected_projects || [];

  console.log('=== 差戻案件デバッグ ===');
  console.log('rejectedProjects:', rejectedProjects);
  console.log('rejectedProjects.length:', rejectedProjects.length);

  if (rejectedProjects.length > 0 && user.role !== 'part_time') {
    document.getElementById('rejectedProjectsSection').classList.remove('hidden');
    const rejectedCardsContainer = document.getElementById('rejectedProjectCards');
    rejectedCardsContainer.innerHTML = '';

    rejectedProjects.forEach(function(project) {
      console.log('差戻案件:', project.project_name);
      console.log('  status:', project.status);
      console.log('  leader_rejection_reason:', project.leader_rejection_reason);

      const card = createProjectCard(project, showProjectEditScreen);

      // 上長差戻で色を変える
      if (project.status === 'rejected' && project.leader_rejection_reason) {
        card.style.borderLeft = '5px solid #ff6b6b';
        card.style.background = '#fff5f5';
      }

      rejectedCardsContainer.appendChild(card);
    });
  } else {
    document.getElementById('rejectedProjectsSection').classList.add('hidden');
  }

  // 進行中の案件を表示（メイン編集者のdraft案件）
  const inProgressProjects = data.projects || [];

  // part_timeは進行中案件セクションを非表示
  if (user.role === 'part_time') {
    document.getElementById('dashboardProjects').classList.add('hidden');
  } else {
    document.getElementById('dashboardProjects').classList.remove('hidden');
    const projectCardsContainer = document.getElementById('projectCards');
    projectCardsContainer.innerHTML = '';

    if (inProgressProjects.length > 0) {
      inProgressProjects.forEach(function(project) {
        const card = createProjectCard(project, showProjectEditScreen);
        projectCardsContainer.appendChild(card);
      });
    } else {
      projectCardsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">進行中の案件はありません</p>';
    }
  }

  // 承認申請案件一覧（リーダーのみ）
  if (user.role === 'leader') {
    document.getElementById('pendingApprovalSection').classList.remove('hidden');
    const approvalCardsContainer = document.getElementById('approvalCards');
    approvalCardsContainer.innerHTML = '';

    if (data.pending_approvals && data.pending_approvals.length > 0) {
      data.pending_approvals.forEach(function(project) {
        const card = createApprovalCard(project);
        approvalCardsContainer.appendChild(card);
      });
    } else {
      approvalCardsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">承認待ちの案件はありません</p>';
    }
  } else {
    document.getElementById('pendingApprovalSection').classList.add('hidden');
  }
}

/**
 * 時間カード作成
 */
function createTimeCard(title, timeData) {
  const card = document.createElement('div');
  card.className = 'time-card';

  const targetHours = Math.floor(timeData.target / 60);
  const targetMins = timeData.target % 60;
  const actualHours = Math.floor(timeData.actual / 60);
  const actualMins = timeData.actual % 60;
  const diff = timeData.actual - timeData.target;
  const diffHours = Math.floor(Math.abs(diff) / 60);
  const diffMins = Math.abs(diff) % 60;
  const diffClass = diff >= 0 ? 'negative' : 'positive';
  const diffSign = diff >= 0 ? '+' : '-';

  let content = '<h3>' + title + '</h3>';
  content += '<div class="time-card-content">';
  content += '<div class="time-card-item">';
  content += '<span class="time-card-label">編集目標時間</span>';
  content += '<span class="time-card-value">' + targetHours + ':' + String(targetMins).padStart(2, '0') + '</span>';
  content += '</div>';
  content += '<div class="time-card-item">';
  content += '<span class="time-card-label">実働編集時間</span>';
  content += '<span class="time-card-value">' + actualHours + ':' + String(actualMins).padStart(2, '0') + '</span>';
  content += '</div>';
  content += '<div class="time-card-item">';
  content += '<span class="time-card-label">差分</span>';
  content += '<span class="time-card-value ' + diffClass + '">' + diffSign + diffHours + ':' + String(diffMins).padStart(2, '0') + '</span>';
  content += '</div>';
  content += '</div>';

  card.innerHTML = content;
  return card;
}

/**
 * プロジェクトカード作成
 */
function createProjectCard(project, clickAction) {
  const card = document.createElement('div');
  card.className = 'project-card';

  // 所属カラーを背景色に設定
  const affiliationColor = project.main_editor_affiliation_id ? getAffiliationColor(project.main_editor_affiliation_id) : null;
  if (affiliationColor) {
    card.style.backgroundColor = affiliationColor;
  }

  // クリック時の動作を設定
  if (clickAction) {
    card.onclick = function() {
      clickAction(project.project_id);
    };
  }

  // 差戻案件の表示
  if (project.status === 'rejected' && project.leader_rejection_reason) {
    let html = '<div class="project-card-header">';
    html += '<div class="project-card-title">' + escapeHtml(project.project_name) + '</div>';
    html += '<span class="status-badge project-card-status-badge" style="background: #ff6b6b; color: white;">上長差戻</span>';
    html += '</div>';

    html += '<div class="project-card-info"><strong>代理店:</strong> ' + (project.agency_name || '-') + '</div>';
    html += '<div class="project-card-info"><strong>クライアント:</strong> ' + (project.client_name || '-') + '</div>';
    html += '<div class="project-card-info"><strong>納品日:</strong> ' + (project.actual_delivery_date || project.delivery_date || '-') + '</div>';

    // 差戻理由を表示
    const rejectionReason = project.leader_rejection_reason || '理由なし';
    html += '<div style="margin-top: 10px; padding: 10px; background: #fff3e0; border-radius: 4px; border-left: 3px solid #ff9800;">';
    html += '<div style="font-weight: bold; margin-bottom: 5px; color: #e65100;">差戻理由</div>';
    html += '<div style="color: #333; white-space: pre-wrap;">' + escapeHtml(rejectionReason) + '</div>';
    html += '</div>';

    card.innerHTML = html;
    return card;
  }

  // 通常の案件表示
  // 差分による色分け（ボーダーの色のみ）
  const diff = project.actual_hours - project.target_hours;
  const threshold = project.target_hours * 0.25; // 目標時間の1/4

  if (diff < 0) {
    card.style.borderLeft = '5px solid #4CAF50'; // マイナス = 緑（順調）
  } else if (diff < threshold) {
    card.style.borderLeft = '5px solid #FFC107'; // プラスだが1/4未満 = 黄色（適正）
  } else {
    card.style.borderLeft = '5px solid #f44336'; // プラスで1/4以上 = 赤（超過）
  }

  let html = '<div class="project-card-header">';
  html += '<div class="project-card-title">' + escapeHtml(project.project_name) + '</div>';
  html += '</div>';

  html += '<div class="project-card-info"><strong>代理店:</strong> ' + (project.agency_name || '-') + '</div>';
  html += '<div class="project-card-info"><strong>納品日:</strong> ' + (project.delivery_date || '-') + '</div>';

  // 時間表示
  const targetHours = Math.floor(project.target_hours / 60);
  const targetMins = project.target_hours % 60;
  const actualHours = Math.floor(project.actual_hours / 60);
  const actualMins = project.actual_hours % 60;
  const diffHours = Math.floor(Math.abs(diff) / 60);
  const diffMins = Math.abs(diff) % 60;
  const diffSign = diff >= 0 ? '+' : '-';
  const diffClass = diff >= 0 ? 'negative' : 'positive';

  html += '<div class="project-card-times">';
  html += '<div class="time-item">';
  html += '<div class="time-item-label">目標時間</div>';
  html += '<div class="time-item-value">' + targetHours + ':' + String(targetMins).padStart(2, '0') + '</div>';
  html += '</div>';
  html += '<div class="time-item">';
  html += '<div class="time-item-label">実働時間</div>';
  html += '<div class="time-item-value">' + actualHours + ':' + String(actualMins).padStart(2, '0') + '</div>';
  html += '</div>';
  html += '<div class="time-item">';
  html += '<div class="time-item-label">差分</div>';
  html += '<div class="time-item-value ' + diffClass + '">' + diffSign + diffHours + ':' + String(diffMins).padStart(2, '0') + '</div>';
  html += '</div>';
  html += '</div>';

  card.innerHTML = html;
  return card;
}

/**
 * 承認カード作成
 */
function createApprovalCard(project) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.style.borderLeft = '5px solid #ff9800';

  // 所属カラーを背景色に設定
  const affiliationColor = project.main_editor_affiliation_id ? getAffiliationColor(project.main_editor_affiliation_id) : null;
  if (affiliationColor) {
    card.style.backgroundColor = affiliationColor;
  }

  card.onclick = function() {
    showApprovalDetail(project.project_id);
  };

  let html = '<div class="project-card-header">';
  html += '<div class="project-card-title">' + escapeHtml(project.project_name) + '</div>';
  html += '<span class="status-badge project-card-status-badge" style="background: #ff9800; color: white;">承認待ち</span>';
  html += '</div>';

  html += '<div class="project-card-info"><strong>申請日:</strong> ' + (formatDate(project.submitted_at) || '-') + '</div>';
  html += '<div class="project-card-info"><strong>代理店:</strong> ' + (project.agency_name || '-') + '</div>';
  html += '<div class="project-card-info"><strong>クライアント:</strong> ' + (project.client_name || '-') + '</div>';
  html += '<div class="project-card-info"><strong>納品日:</strong> ' + (project.actual_delivery_date || '-') + '</div>';
  html += '<div class="project-card-info"><strong>申請者:</strong> ' + (project.main_editor_name || '-') + '</div>';

  card.innerHTML = html;
  return card;
}
