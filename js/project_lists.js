// ========================================
// 案件リスト関連画面
// ========================================

/**
 * 案件編集リスト画面（案件詳細登録）
 * draft または rejected (上長差戻) の案件を表示
 */
async function showProjectEditList() {
  hideAllScreens();
  const screen = document.getElementById('project-search-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('project-edit-list');

  showLoading('project-search-screen');

  const user = getCurrentUser();
  const result = await searchProjects({
    main_editor: user.user_id,
    status: '' // draftとrejectedの両方を取得
  });

  if (!result.success) {
    screen.innerHTML = `
      <div class="card">
        <h2>案件詳細登録</h2>
        ${createBackButton('showDashboard()')}
        <div class="message error">${escapeHtml(result.message)}</div>
      </div>
    `;
    return;
  }

  // draftとrejectedのみフィルタ
  const editableProjects = (result.data || []).filter(p =>
    p.status === 'draft' || p.status === 'rejected'
  );

  const html = `
    <div class="card">
      <h2>案件詳細登録</h2>
      ${createBackButton('showDashboard()')}

      <p style="margin-bottom: 20px; color: #666;">
        メイン編集者として登録されている編集可能な案件一覧です。案件をクリックして詳細を編集してください。
      </p>

      ${editableProjects.length === 0 ?
        '<div class="message">編集可能な案件がありません</div>' :
        renderProjectListTable(editableProjects, 'showProjectEditScreen')
      }
    </div>
  `;

  screen.innerHTML = html;
}

/**
 * 案件申請リスト画面
 * 申請可能な案件（draft, rejected）を表示
 */
async function showProjectSubmitList() {
  hideAllScreens();
  const screen = document.getElementById('project-search-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('project-submit-list');

  showLoading('project-search-screen');

  const user = getCurrentUser();
  const result = await searchProjects({
    main_editor: user.user_id,
    status: '' // 全ステータス取得
  });

  if (!result.success) {
    screen.innerHTML = `
      <div class="card">
        <h2>申請</h2>
        ${createBackButton('showDashboard()')}
        <div class="message error">${escapeHtml(result.message)}</div>
      </div>
    `;
    return;
  }

  // 申請可能な案件（draftとrejected）をフィルタ
  const submittableProjects = (result.data || []).filter(p =>
    p.status === 'draft' || p.status === 'rejected'
  );

  const html = `
    <div class="card">
      <h2>申請</h2>
      ${createBackButton('showDashboard()')}

      <p style="margin-bottom: 20px; color: #666;">
        申請可能な案件一覧です。案件をクリックして申請内容を確認・入力してください。
      </p>

      ${submittableProjects.length === 0 ?
        '<div class="message">申請可能な案件がありません</div>' :
        renderProjectListTable(submittableProjects, 'showProjectSubmitScreen')
      }
    </div>
  `;

  screen.innerHTML = html;
}

/**
 * 上長からのフィードバック画面
 * 過去2ヶ月の leader_approved 案件を表示
 */
async function showFeedbackList() {
  hideAllScreens();
  const screen = document.getElementById('project-search-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('feedback-list');

  showLoading('project-search-screen');

  const user = getCurrentUser();

  // 過去2ヶ月の日付を計算
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const result = await searchProjects({
    main_editor: user.user_id,
    status: 'leader_approved'
  });

  if (!result.success) {
    screen.innerHTML = `
      <div class="card">
        <h2>上長からのフィードバック</h2>
        ${createBackButton('showDashboard()')}
        <div class="message error">${escapeHtml(result.message)}</div>
      </div>
    `;
    return;
  }

  // 過去2ヶ月の承認済案件をフィルタ
  const feedbackProjects = (result.data || []).filter(p => {
    if (!p.leader_approved_at) return false;
    const approvedDate = new Date(p.leader_approved_at);
    return approvedDate >= twoMonthsAgo;
  });

  const html = `
    <div class="card">
      <h2>上長からのフィードバック</h2>
      ${createBackButton('showDashboard()')}

      <p style="margin-bottom: 20px; color: #666;">
        過去2ヶ月間に上長承認された案件一覧です。案件をクリックして上長からのフィードバックを確認してください。
      </p>

      ${feedbackProjects.length === 0 ?
        '<div class="message">過去2ヶ月のフィードバックはありません</div>' :
        renderProjectListTable(feedbackProjects, 'showProjectDetail')
      }
    </div>
  `;

  screen.innerHTML = html;
}

/**
 * 案件リストテーブルを生成
 */
function renderProjectListTable(projects, clickAction) {
  const statusLabels = {
    'draft': '下書き',
    'submitted': '提出済み',
    'leader_approved': 'リーダー承認済',
    'executive_approved': '役員承認済',
    'rejected': '差戻'
  };

  let html = `
    <table class="results-table">
      <thead>
        <tr>
          <th>案件名</th>
          <th>クライアント</th>
          <th>納期</th>
          <th>ステータス</th>
        </tr>
      </thead>
      <tbody>
  `;

  projects.forEach(project => {
    const statusLabel = statusLabels[project.status] || project.status || '-';
    html += `
      <tr onclick="${clickAction}('${project.project_id}')" style="cursor: pointer;">
        <td>${escapeHtml(project.project_name)}</td>
        <td>${escapeHtml(project.client_name || '-')}</td>
        <td>${formatDate(project.delivery_date) || '-'}</td>
        <td><span class="status-badge">${statusLabel}</span></td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
}

/**
 * 案件申請画面（簡易版）
 * 将来的に詳細な申請フォームを実装
 */
async function showProjectSubmitScreen(projectId) {
  // 現時点では案件編集画面にリダイレクト
  showProjectEditScreen(projectId);
}
