// ========================================
// 案件関連画面
// ========================================

// マスタデータのキャッシュ
let cachedMasterData = {
  clients: [],
  users: [],
  genres: [],
  technologies: [],
  estimateItems: [],
  editItems: [],
  affiliations: [],
  teams: []
};

/**
 * マスタデータを読み込み
 */
async function loadMasterData() {
  const [clients, users, genres, techs, estimateItems, editItems, affiliations, teams] = await Promise.all([
    getClients(),
    getUsers(),
    getGenres(),
    getTechnologies(),
    getEstimateItems(),
    getEditItems(),
    getAffiliations(),
    getTeams()
  ]);

  if (clients.success) cachedMasterData.clients = clients.data;
  if (users.success) {
    cachedMasterData.users = users.data;
    // 編集者のみをフィルタリング（メイン編集者・サブ編集者・ディレクター用）
    cachedMasterData.editors = users.data.filter(u => u.is_editor && u.is_active);
  }
  if (genres.success) cachedMasterData.genres = genres.data;
  if (techs.success) cachedMasterData.technologies = techs.data;
  if (estimateItems.success) cachedMasterData.estimateItems = estimateItems.data;
  if (editItems.success) cachedMasterData.editItems = editItems.data;
  if (affiliations.success) cachedMasterData.affiliations = affiliations.data;
  if (teams.success) cachedMasterData.teams = teams.data;

  return cachedMasterData;
}

/**
 * 案件登録画面表示
 */
async function showProjectRegistration() {
  hideAllScreens();
  const screen = document.getElementById('project-registration-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('project-registration');

  showLoading('project-registration-screen');

  // マスタデータ読み込み
  await loadMasterData();

  const html = `
    <div class="card">
      <h2>案件登録</h2>
      ${createBackButton('showDashboard()')}

      <form id="project-reg-form">
        <div class="form-group">
          <label>クライアント <span style="color: red;">*</span></label>
          <div style="display: flex; gap: 10px;">
            <select id="client-id" style="flex: 1;" required>
              ${createSelectOptions(cachedMasterData.clients, 'client_id', 'client_name')}
            </select>
            <button type="button" class="btn btn-secondary" onclick="showAddClientModal()">新規追加</button>
            <button type="button" class="btn btn-secondary" onclick="showEditClientModal()">名前修正</button>
          </div>
        </div>

        <div class="form-group">
          <label>代理店名</label>
          <input type="text" id="agency-name">
        </div>

        <div class="form-group">
          <label>案件名 <span style="color: red;">*</span></label>
          <input type="text" id="project-name" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label>案件番号</label>
            <input type="text" value="自動採番" disabled style="background: #f0f0f0;">
          </div>
          <div class="form-group">
            <label>登録日</label>
            <input type="text" value="自動入力" disabled style="background: #f0f0f0;">
          </div>
        </div>

        <div class="form-group">
          <label>納品予定日</label>
          <input type="date" id="delivery-date">
        </div>

        <div class="form-group">
          <label>メイン編集者 <span style="color: red;">*</span></label>
          <select id="main-editor" required>
            ${createSelectOptions(cachedMasterData.editors, 'user_id', 'name')}
          </select>
        </div>

        <div class="form-group">
          <label>サブ編集者</label>
          <div class="multi-select" id="sub-editors">
            ${createCheckboxes(cachedMasterData.editors, 'user_id', 'name')}
          </div>
        </div>

        <div class="form-group">
          <label>ディレクター</label>
          <select id="director">
            ${createSelectOptions(cachedMasterData.editors, 'user_id', 'name')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label>映像ジャンル</label>
            <div class="multi-select" id="genres">
              ${createCheckboxes(cachedMasterData.genres, 'genre_id', 'genre_name')}
            </div>
          </div>
          <div class="form-group">
            <label>使用技術</label>
            <div class="multi-select" id="technologies">
              ${createCheckboxes(cachedMasterData.technologies, 'tech_id', 'tech_name')}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>見積番号</label>
          <input type="text" id="estimate-number" placeholder="例：EST-2025-001">
        </div>

        <div class="form-group">
          <label>お見積りPDF</label>
          <input type="file" id="pdf-file" accept=".pdf">
          <div id="pdf-upload-status" style="margin-top: 10px; color: #666;"></div>
        </div>

        <div class="form-group">
          <label>編集費内訳</label>
          <div id="estimate-breakdown"></div>
          <button type="button" class="add-row-btn" onclick="addEstimateRow()">+ 行追加</button>
          <div style="margin-top: 10px; font-weight: bold;">
            見積りの編集費 合計: <span id="estimate-total">0</span>円
          </div>
        </div>

        <div class="target-hours-highlight">
          <label>編集目標時間</label>
          <input type="text" id="target-hours" value="0時間0分" disabled style="background: #f0f0f0;">
        </div>

        <div class="btn-group">
          <button type="button" class="btn btn-secondary" onclick="showDashboard()">戻る</button>
          <button type="submit" class="btn btn-primary">登録</button>
        </div>
        <div id="project-reg-message"></div>
      </form>
    </div>

    <!-- クライアント追加モーダル -->
    <div id="add-client-modal" class="modal">
      <div class="modal-content">
        <span class="close" onclick="closeAddClientModal()">&times;</span>
        <h2>クライアント追加</h2>
        <form id="add-client-form">
          <div class="form-group">
            <label>クライアント名 <span style="color: red;">*</span></label>
            <input type="text" id="new-client-name" required>
          </div>
          <div class="form-group">
            <label>代理店名</label>
            <input type="text" id="new-agency-name">
          </div>
          <div class="btn-group">
            <button type="submit" class="btn btn-primary">追加</button>
            <button type="button" class="btn btn-secondary" onclick="closeAddClientModal()">キャンセル</button>
          </div>
        </form>
        <div id="add-client-message"></div>
      </div>
    </div>

    <!-- クライアント編集モーダル -->
    <div id="edit-client-modal" class="modal">
      <div class="modal-content">
        <span class="close" onclick="closeEditClientModal()">&times;</span>
        <h2>クライアント情報修正</h2>
        <form id="edit-client-form">
          <div class="form-group">
            <label>クライアント名 <span style="color: red;">*</span></label>
            <input type="text" id="edit-client-name" required>
          </div>
          <div class="form-group">
            <label>代理店名</label>
            <input type="text" id="edit-client-agency-name">
          </div>
          <div class="btn-group">
            <button type="submit" class="btn btn-primary">更新</button>
            <button type="button" class="btn btn-secondary" onclick="closeEditClientModal()">キャンセル</button>
          </div>
        </form>
        <div id="edit-client-message"></div>
      </div>
    </div>
  `;

  screen.innerHTML = html;

  // フォーム送信イベント
  document.getElementById('project-reg-form').onsubmit = async function(e) {
    e.preventDefault();
    await handleProjectSubmit();
    return false;
  };

  document.getElementById('add-client-form').onsubmit = async function(e) {
    e.preventDefault();
    await handleAddClient();
    return false;
  };

  document.getElementById('edit-client-form').onsubmit = async function(e) {
    e.preventDefault();
    await handleEditClient();
    return false;
  };

  // 初期行追加
  addEstimateRow();
}

/**
 * 見積内訳行追加
 */
function addEstimateRow() {
  const container = document.getElementById('estimate-breakdown');
  const rowDiv = document.createElement('div');
  rowDiv.className = 'breakdown-row';

  let optionsHtml = '<option value="">選択してください</option>';
  cachedMasterData.editItems.forEach(item => {
    optionsHtml += `<option value="${item.edit_item_id}" data-rate="${item.hourly_rate}">${escapeHtml(item.edit_item_name)}</option>`;
  });

  rowDiv.innerHTML = `
    <select class="estimate-item" onchange="calculateEstimateTotal()">
      ${optionsHtml}
    </select>
    <input type="number" class="estimate-amount" placeholder="金額" onchange="calculateEstimateTotal()">
    <button type="button" class="remove-row-btn" onclick="this.parentElement.remove(); calculateEstimateTotal();">削除</button>
  `;

  container.appendChild(rowDiv);
}

/**
 * 見積合計計算
 */
function calculateEstimateTotal() {
  const rows = document.querySelectorAll('#estimate-breakdown .breakdown-row');
  let total = 0;
  let totalMinutes = 0;

  rows.forEach(row => {
    const itemSelect = row.querySelector('.estimate-item');
    const amountInput = row.querySelector('.estimate-amount');
    const amount = parseInt(amountInput.value) || 0;
    total += amount;

    // 各行のedit_itemの時給を使って個別に計算
    if (itemSelect.value && amount > 0) {
      const selectedOption = itemSelect.options[itemSelect.selectedIndex];
      const hourlyRate = parseFloat(selectedOption.dataset.rate) || 0;
      if (hourlyRate > 0) {
        const hours = amount / hourlyRate;
        totalMinutes += hours * 60;
      }
    }
  });

  document.getElementById('estimate-total').textContent = formatNumber(total);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  document.getElementById('target-hours').value = `${hours}時間${minutes}分`;
}

/**
 * 案件登録処理
 */
async function handleProjectSubmit() {
  const clientId = document.getElementById('client-id').value;
  const projectName = document.getElementById('project-name').value;

  if (!clientId || !projectName) {
    showMessage('project-reg-message', '必須項目を入力してください', 'error');
    return;
  }

  // 重複チェック（同じクライアント・同じ案件名）
  showMessage('project-reg-message', '重複チェック中...', 'success');
  const dupCheck = await checkDuplicateProject(clientId, projectName);
  if (dupCheck.isDuplicate) {
    showMessage('project-reg-message', '同じクライアント・同じ案件名の案件が既に登録されています。', 'error');
    return;
  }

  // 見積内訳収集
  const breakdownRows = document.querySelectorAll('#estimate-breakdown .breakdown-row');
  const breakdown = [];
  breakdownRows.forEach(row => {
    const itemId = row.querySelector('.estimate-item').value;
    const amount = parseInt(row.querySelector('.estimate-amount').value) || 0;
    if (itemId && amount > 0) {
      breakdown.push({ estimate_item_id: itemId, amount: amount });
    }
  });

  // サブ編集者収集
  const subEditors = [];
  document.querySelectorAll('#sub-editors input[type="checkbox"]:checked').forEach(cb => {
    subEditors.push(cb.value);
  });

  // ジャンル収集
  const genres = [];
  document.querySelectorAll('#genres input[type="checkbox"]:checked').forEach(cb => {
    genres.push(cb.value);
  });

  // 使用技術収集
  const technologies = [];
  document.querySelectorAll('#technologies input[type="checkbox"]:checked').forEach(cb => {
    technologies.push(cb.value);
  });

  const projectData = {
    client_id: clientId,
    agency_name: document.getElementById('agency-name').value,
    project_name: projectName,
    delivery_date: document.getElementById('delivery-date').value,
    main_editor: document.getElementById('main-editor').value,
    sub_editors: subEditors,
    director: document.getElementById('director').value,
    genres: genres,
    technologies: technologies,
    estimate_number: document.getElementById('estimate-number').value,
    estimate_breakdown: breakdown
  };

  // PDFファイルを追加
  const pdfFile = document.getElementById('pdf-file').files[0];
  if (pdfFile) {
    document.getElementById('pdf-upload-status').textContent = 'PDFアップロード中...';
    projectData.pdf_file = pdfFile;
  }

  showMessage('project-reg-message', '登録中...', 'success');

  const result = await saveProject(projectData);

  if (result.success) {
    showMessage('project-reg-message', result.message, 'success');
    document.getElementById('pdf-upload-status').textContent = '';

    setTimeout(() => {
      showDashboard();
    }, 2000);
  } else {
    showMessage('project-reg-message', result.message, 'error');
    document.getElementById('pdf-upload-status').textContent = '';
  }
}

/**
 * クライアント追加モーダル表示
 */
function showAddClientModal() {
  document.getElementById('add-client-modal').style.display = 'block';
  document.getElementById('add-client-message').innerHTML = '';
}

/**
 * クライアント追加モーダル閉じる
 */
function closeAddClientModal() {
  document.getElementById('add-client-modal').style.display = 'none';
  document.getElementById('add-client-form').reset();
  document.getElementById('add-client-message').innerHTML = '';
}

/**
 * クライアント編集モーダル表示
 */
function showEditClientModal() {
  const clientSelect = document.getElementById('client-id');
  const selectedClientId = clientSelect.value;

  if (!selectedClientId) {
    alert('編集するクライアントを選択してください');
    return;
  }

  const client = cachedMasterData.clients.find(c => c.client_id === selectedClientId);
  if (!client) {
    alert('クライアント情報が見つかりません');
    return;
  }

  document.getElementById('edit-client-name').value = client.client_name;
  document.getElementById('edit-client-agency-name').value = client.agency_name || '';
  document.getElementById('edit-client-modal').style.display = 'block';
  document.getElementById('edit-client-message').innerHTML = '';
}

/**
 * クライアント編集モーダル閉じる
 */
function closeEditClientModal() {
  document.getElementById('edit-client-modal').style.display = 'none';
  document.getElementById('edit-client-form').reset();
  document.getElementById('edit-client-message').innerHTML = '';
}

/**
 * クライアント編集処理
 */
async function handleEditClient() {
  const clientSelect = document.getElementById('client-id');
  const selectedClientId = clientSelect.value;
  const newClientName = document.getElementById('edit-client-name').value;
  const newAgencyName = document.getElementById('edit-client-agency-name').value;

  if (!newClientName) {
    showMessage('edit-client-message', 'クライアント名を入力してください', 'error');
    return;
  }

  showMessage('edit-client-message', '更新中...', 'success');

  const result = await updateClientInfo(selectedClientId, newClientName, newAgencyName);

  if (result.success) {
    showMessage('edit-client-message', result.message, 'success');

    // キャッシュ更新
    const clientIndex = cachedMasterData.clients.findIndex(c => c.client_id === selectedClientId);
    if (clientIndex >= 0) {
      cachedMasterData.clients[clientIndex].client_name = newClientName;
      cachedMasterData.clients[clientIndex].agency_name = newAgencyName;
    }

    // セレクトボックスの表示名を更新
    const selectedOption = clientSelect.options[clientSelect.selectedIndex];
    if (selectedOption) {
      selectedOption.textContent = newClientName;
    }

    setTimeout(() => {
      closeEditClientModal();
    }, 1000);
  } else {
    showMessage('edit-client-message', result.message, 'error');
  }
}

/**
 * クライアント追加処理
 */
async function handleAddClient() {
  const clientName = document.getElementById('new-client-name').value;
  const agencyName = document.getElementById('new-agency-name').value;

  if (!clientName) {
    showMessage('add-client-message', 'クライアント名を入力してください', 'error');
    return;
  }

  showMessage('add-client-message', '追加中...', 'success');

  const result = await addClient(clientName, agencyName);

  if (result.success) {
    showMessage('add-client-message', result.message, 'success');
    cachedMasterData.clients.push(result.data);

    // セレクトボックスに追加
    const clientSelect = document.getElementById('client-id');
    const option = document.createElement('option');
    option.value = result.data.client_id;
    option.textContent = result.data.client_name;
    option.selected = true;
    clientSelect.appendChild(option);

    // 代理店名を自動入力
    if (result.data.agency_name) {
      document.getElementById('agency-name').value = result.data.agency_name;
    }

    setTimeout(() => {
      closeAddClientModal();
    }, 1000);
  } else {
    showMessage('add-client-message', result.message, 'error');
  }
}

/**
 * 案件検索画面表示
 */
async function showProjectSearch() {
  hideAllScreens();
  const screen = document.getElementById('project-search-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('project-search');

  await loadMasterData();

  const html = `
    <div class="card">
      <h2>案件検索</h2>
      ${createBackButton('showDashboard()')}

      <!-- 検索フォーム -->
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label>代理店</label>
            <input type="text" id="search-agency" placeholder="代理店名で検索">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>クライアント名</label>
            <select id="search-client">
              ${createSelectOptions(cachedMasterData.clients, 'client_id', 'client_name')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>案件名</label>
            <input type="text" id="search-project-name" placeholder="案件名で検索">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label>メイン編集担当者</label>
            <select id="search-main-editor">
              ${createSelectOptions(cachedMasterData.editors, 'user_id', 'name')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>サブ編集担当者</label>
            <select id="search-sub-editor">
              ${createSelectOptions(cachedMasterData.editors, 'user_id', 'name')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>納品予定日</label>
            <input type="date" id="search-delivery-date">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label>ステータス</label>
            <select id="search-status">
              <option value="">すべて</option>
              <option value="draft">下書き</option>
              <option value="submitted">提出済み</option>
              <option value="leader_approved">リーダー承認済</option>
              <option value="executive_approved">役員承認済</option>
              <option value="rejected">差戻</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>納品予定日範囲</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="date" id="search-delivery-date-from" style="flex: 1;">
              <span>〜</span>
              <input type="date" id="search-delivery-date-to" style="flex: 1;">
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn btn-primary" onclick="handleProjectSearch()">検索</button>
          <button type="button" class="btn btn-secondary" onclick="clearProjectSearchForm()">クリア</button>
        </div>
      </div>

      <!-- 検索結果 -->
      <div id="search-results">
        <div style="text-align: center; padding: 40px; color: #999;">
          検索条件を指定して「検索」ボタンを押してください
        </div>
      </div>
    </div>
  `;

  screen.innerHTML = html;
}

/**
 * 案件検索フォームクリア
 */
function clearProjectSearchForm() {
  document.getElementById('search-agency').value = '';
  document.getElementById('search-client').value = '';
  document.getElementById('search-project-name').value = '';
  document.getElementById('search-main-editor').value = '';
  document.getElementById('search-sub-editor').value = '';
  document.getElementById('search-delivery-date').value = '';
  document.getElementById('search-status').value = '';
  document.getElementById('search-delivery-date-from').value = '';
  document.getElementById('search-delivery-date-to').value = '';

  document.getElementById('search-results').innerHTML = `
    <div style="text-align: center; padding: 40px; color: #999;">
      検索条件を指定して「検索」ボタンを押してください
    </div>
  `;
}

/**
 * 案件検索実行
 */
async function handleProjectSearch() {
  const searchParams = {
    agency_name: document.getElementById('search-agency').value,
    client_id: document.getElementById('search-client').value,
    project_name: document.getElementById('search-project-name').value,
    main_editor: document.getElementById('search-main-editor').value,
    sub_editor: document.getElementById('search-sub-editor').value,
    delivery_date: document.getElementById('search-delivery-date').value,
    delivery_date_from: document.getElementById('search-delivery-date-from').value,
    delivery_date_to: document.getElementById('search-delivery-date-to').value,
    status: document.getElementById('search-status').value
  };

  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">検索中...</div>';

  const result = await searchProjects(searchParams);

  if (result.success) {
    renderProjectSearchResults(result.data || []);
  } else {
    resultsDiv.innerHTML = `<div class="message error">${escapeHtml(result.message)}</div>`;
  }
}

/**
 * 検索結果表示
 */
function renderProjectSearchResults(projects) {
  const resultsDiv = document.getElementById('search-results');

  if (projects.length === 0) {
    resultsDiv.innerHTML = '<p style="text-align: center; padding: 20px;">該当する案件が見つかりませんでした</p>';
    return;
  }

  let html = `
    <h3 style="margin-top: 30px;">検索結果 (${projects.length}件)</h3>
    <table class="results-table">
      <thead>
        <tr>
          <th>案件名</th>
          <th>クライアント</th>
          <th>納期</th>
          <th>メイン編集者</th>
          <th>ステータス</th>
          <th>承認</th>
        </tr>
      </thead>
      <tbody>
  `;

  projects.forEach(project => {
    // ステータスラベル
    const statusLabels = {
      'draft': '下書き',
      'submitted': '提出済み',
      'leader_approved': 'リーダー承認済',
      'executive_approved': '役員承認済',
      'rejected': '差戻'
    };
    const statusLabel = statusLabels[project.status] || project.status || '-';

    html += `
      <tr onclick="showProjectDetail('${project.project_id}')" style="cursor: pointer;">
        <td>${escapeHtml(project.project_name)}</td>
        <td>${escapeHtml(project.client_name || '-')}</td>
        <td>${formatDate(project.delivery_date) || '-'}</td>
        <td>${escapeHtml(project.main_editor_name || '-')}</td>
        <td><span class="status-badge">${statusLabel}</span></td>
        <td>${project.submitted_at ? '提出済' : '-'}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  resultsDiv.innerHTML = html;
}

/**
 * 案件詳細画面表示
 */
/**
 * マイルストーンセクションHTML生成
 */
function buildMilestoneSection(milestones, projectId) {
  if (!milestones || milestones.length === 0) return '';

  const today = new Date().toISOString().split('T')[0];

  // ステッパーバー
  const stepperHtml = milestones.map((m, i) => {
    let stepClass = 'milestone-upcoming';
    if (m.completed_date) {
      stepClass = 'milestone-completed';
    } else if (m.planned_date && m.planned_date < today) {
      stepClass = 'milestone-overdue';
    }
    const line = i > 0 ? '<div class="milestone-line"></div>' : '';
    const nodeContent = m.completed_date ? '✓' : (i + 1);
    return `
      <div class="milestone-step ${stepClass}">
        ${line}
        <div class="milestone-node">
          ${nodeContent}
        </div>
        <div class="milestone-label">${escapeHtml(m.milestone_name)}</div>
        <div class="milestone-date">${m.planned_date || '-'}</div>
      </div>
    `;
  }).join('');

  // テーブル行
  const tableRows = milestones.map(m => {
    let statusBadge = '<span class="status-badge" style="background:#e0e0e0;color:#666;">予定</span>';
    if (m.completed_date) {
      statusBadge = '<span class="status-badge" style="background:#d4edda;color:#155724;">完了</span>';
    } else if (m.planned_date && m.planned_date < today) {
      statusBadge = '<span class="status-badge" style="background:#f8d7da;color:#721c24;">遅延</span>';
    }
    const btnClass = m.completed_date ? 'btn-secondary' : 'btn-primary';
    const btnLabel = m.completed_date ? '取消' : '完了にする';
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding:10px;">${escapeHtml(m.milestone_name)}</td>
        <td style="padding:10px;text-align:center;">${m.planned_date || '-'}</td>
        <td style="padding:10px;text-align:center;">${m.completed_date || '-'}</td>
        <td style="padding:10px;text-align:center;">${statusBadge}</td>
        <td style="padding:10px;text-align:center;">
          <button class="btn btn-sm ${btnClass}" onclick="handleToggleMilestone('${m.id}', '${projectId}')">${btnLabel}</button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">進捗マイルストーン</h3>
    <div class="milestone-stepper">${stepperHtml}</div>
    <table style="width:100%;border-collapse:collapse;margin-top:15px;">
      <thead>
        <tr style="background:#f5f5f5;border-bottom:2px solid #ddd;">
          <th style="padding:10px;text-align:left;">工程</th>
          <th style="padding:10px;text-align:center;">予定日</th>
          <th style="padding:10px;text-align:center;">完了日</th>
          <th style="padding:10px;text-align:center;">状態</th>
          <th style="padding:10px;text-align:center;">操作</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

/**
 * マイルストーン完了トグル処理
 */
async function handleToggleMilestone(milestoneId, projectId) {
  const result = await toggleMilestoneComplete(milestoneId);
  if (result.success) {
    showProjectDetail(projectId);
  } else {
    alert(result.message);
  }
}

async function showProjectDetail(projectId) {
  hideAllScreens();
  const screen = document.getElementById('project-detail-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('project-detail', { projectId });

  showLoading('project-detail-screen');

  const [result, milestonesResult] = await Promise.all([
    getProjectDetail(projectId),
    getProjectMilestones(projectId)
  ]);

  if (!result.success) {
    showError('project-detail-screen', result.message);
    return;
  }

  const project = result.data;
  const milestones = milestonesResult.success ? milestonesResult.data : [];
  const user = getCurrentUser();

  // 編集・申請ボタンの表示条件
  console.log('=== 編集可否チェック ===');
  console.log('status:', project.status);
  console.log('main_editor_id:', project.main_editor_id);
  console.log('user.user_id:', user.user_id);

  const canEdit = (project.status === 'draft' || (project.status === 'rejected' && project.leader_rejection_reason)) &&
                  project.main_editor_id === user.user_id;

  const canDelete = project.status === 'draft' &&
                    (project.main_editor_id === user.user_id || user.is_admin);

  console.log('canEdit:', canEdit);
  console.log('canDelete:', canDelete);

  // ジャンルと使用技術の表示
  const genresDisplay = project.genres_names && project.genres_names.length > 0
    ? project.genres_names.map(name => escapeHtml(name)).join(', ')
    : '-';

  const technologiesDisplay = project.technologies_names && project.technologies_names.length > 0
    ? project.technologies_names.map(name => escapeHtml(name)).join(', ')
    : '-';

  // 完成URLの表示
  const completedUrlsHtml = project.completed_urls && project.completed_urls.length > 0
    ? `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">${project.completed_urls.map(url => createVideoEmbed(url)).join('')}</div>`
    : '<p style="color: #999;">URLが登録されていません</p>';

  const html = `
    <div class="card">
      <div class="detail-header">
        <h2>案件詳細</h2>
        <div class="detail-meta">
          <div><strong>案件番号:</strong> ${escapeHtml(project.project_id)}</div>
          <div><strong>登録日:</strong> ${project.registration_date || '-'}</div>
        </div>
      </div>

      <!-- 編集ボタン（上部） -->
      ${canEdit ? `
        <div class="btn-group" style="margin-bottom: 20px;">
          <button class="btn btn-primary" onclick="showProjectEditScreen('${project.project_id}')">案件編集</button>
        </div>
      ` : ''}

      <!-- 基本情報 -->
      <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">基本情報</h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="form-group">
          <label>代理店名</label>
          <p>${escapeHtml(project.agency_name || '-')}</p>
        </div>
        <div class="form-group">
          <label>クライアント名</label>
          <p>${escapeHtml(project.client_name)}</p>
        </div>
      </div>

      <div class="form-group">
        <label>案件名</label>
        <p>${escapeHtml(project.project_name)}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="form-group">
          <label>納品予定日</label>
          <p>${project.delivery_date || '-'}</p>
        </div>
        <div class="form-group">
          <label>納品日</label>
          <p>${project.actual_delivery_date || '-'}</p>
        </div>
      </div>

      <!-- 担当者 -->
      <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">担当者</h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="form-group">
          <label>メイン編集者</label>
          <p>${escapeHtml(project.main_editor_name || '-')}</p>
        </div>
        <div class="form-group">
          <label>ディレクター</label>
          <p>${escapeHtml(project.director_name || '-')}</p>
        </div>
      </div>

      <div class="form-group">
        <label>サブ編集者</label>
        <p>${project.sub_editors_names && project.sub_editors_names.length > 0 ? project.sub_editors_names.join(', ') : '-'}</p>
      </div>

      <!-- ジャンル及び使用技術 -->
      <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">ジャンル 及び 使用技術</h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="form-group">
          <label>映像ジャンル</label>
          <p>${genresDisplay}</p>
        </div>
        <div class="form-group">
          <label>使用技術</label>
          <p>${technologiesDisplay}</p>
        </div>
      </div>

      <!-- 完成データ保管場所 -->
      <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">完成データ保管場所 及び サンプルムービー視聴URL</h3>

      <div class="form-group">
        <label>完成データ保管場所</label>
        <p>${escapeHtml(project.file_storage_url || '-')}</p>
      </div>

      <div class="form-group">
        <label>サンプルムービー視聴URL</label>
        ${completedUrlsHtml}
      </div>

      <!-- お見積り及び編集費内訳 -->
      <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">お見積り 及び 編集費内訳</h3>

      <div class="form-group">
        <label>見積番号</label>
        <p>${escapeHtml(project.estimate_number || '-')}</p>
      </div>

      <div class="form-group">
        <label>お見積りPDF</label>
        ${project.estimate_pdf_url ? `
          <div style="margin-top: 10px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="viewPdf('${escapeHtml(project.estimate_pdf_url)}')">PDFを表示</button>
          </div>
        ` : '<p style="color: #999;">PDFが登録されていません</p>'}
      </div>

      <div class="form-group">
        <label>編集費内訳</label>
        ${project.estimate_breakdown && project.estimate_breakdown.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                <th style="padding: 10px; text-align: left;">項目</th>
                <th style="padding: 10px; text-align: right;">金額</th>
              </tr>
            </thead>
            <tbody>
              ${project.estimate_breakdown.map(item => {
                const itemName = item.edit_item?.edit_item_name || '-';
                const amount = item.amount || 0;
                return `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${escapeHtml(itemName)}</td>
                    <td style="padding: 10px; text-align: right;">¥${formatNumber(amount)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : '<p style="color: #999;">内訳データがありません</p>'}
      </div>

      <div class="form-group">
        <div class="calc-result">
          編集費合計金額: ¥${formatNumber(project.estimate_total || 0)}
        </div>
      </div>

      <!-- 進捗マイルストーン -->
      ${buildMilestoneSection(milestones, project.project_id)}

      <!-- 編集目標時間と実働編集時間 -->
      <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">編集目標時間と実働編集時間</h3>

      <div class="time-highlight-cards">
        <div class="time-highlight-card">
          <label>編集目標時間</label>
          <div class="value">${minutesToTime(project.target_hours || 0)}</div>
        </div>
        <div class="time-highlight-card">
          <label>実働編集時間</label>
          <div class="value">${minutesToTime(project.total_edit_hours || 0)}</div>
        </div>
        <div class="time-highlight-card">
          <label>目標と実働の差</label>
          <div class="value ${(project.total_edit_hours || 0) - (project.target_hours || 0) > 0 ? 'over' : ''}">
            ${((project.total_edit_hours || 0) - (project.target_hours || 0)) >= 0 ? '+' : ''}${minutesToTime(Math.abs((project.total_edit_hours || 0) - (project.target_hours || 0)))}
          </div>
        </div>
      </div>

      <!-- 編集時間履歴 -->
      ${project.edit_history && project.edit_history.length > 0 ? `
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">編集時間履歴</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                <th style="padding: 10px; text-align: left;">日付</th>
                <th style="padding: 10px; text-align: left;">項目</th>
                <th style="padding: 10px; text-align: right;">時間</th>
                <th style="padding: 10px; text-align: left;">編集者</th>
                <th style="padding: 10px; text-align: left;">メモ</th>
              </tr>
            </thead>
            <tbody>
              ${project.edit_history.map(h => {
                const totalMinutes = h.edit_time || 0;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const timeDisplay = `${hours}:${String(minutes).padStart(2, '0')}`;
                return `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px;">${h.date || '-'}</td>
                  <td style="padding: 8px;">${escapeHtml(h.edit_item_name || '-')}</td>
                  <td style="padding: 8px; text-align: right;">${timeDisplay}</td>
                  <td style="padding: 8px;">${escapeHtml(h.editor_name || '-')}</td>
                  <td style="padding: 8px;">${escapeHtml(h.memo || '-')}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- メイン編集者コメント -->
      <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">メイン編集者コメント</h3>

      <div class="form-group">
        <label>編集作業を終えての振り返り</label>
        <p style="white-space: pre-wrap;">${escapeHtml(project.reflection || '-')}</p>
      </div>

      <div class="form-group">
        <label>上長に共有したいこと・サポートしてほしい点</label>
        <p style="white-space: pre-wrap;">${escapeHtml(project.main_editor_message || '-')}</p>
      </div>

      <div class="form-group">
        <label>その他気づいた点など</label>
        <p style="white-space: pre-wrap;">${escapeHtml(project.other_notes || '-')}</p>
      </div>

      <div class="form-group">
        <label>申請上長</label>
        <p>${escapeHtml(project.assigned_leader_name || '-')}</p>
      </div>

      <!-- 上長からのフィードバック -->
      ${project.leader_message ? `
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">上長からのフィードバック</h3>
          <div style="padding: 8px; background: white; border: 1px solid #ddd; border-radius: 4px; min-height: 60px; white-space: pre-wrap;">${escapeHtml(project.leader_message)}</div>
        </div>
      ` : ''}

      <!-- ボタン（下部） -->
      <div class="btn-group" style="margin-top: 30px;">
        ${canEdit ? `
          <button class="btn btn-primary" onclick="showProjectEditScreen('${project.project_id}')">案件編集</button>
        ` : ''}
        <button class="btn btn-secondary" onclick="showProjectSearch()">案件検索に戻る</button>
        <button class="btn btn-secondary" onclick="showDashboard()">TOPに戻る</button>
        ${canDelete ? `
          <button class="btn btn-danger" onclick="confirmDeleteProject('${project.project_id}')" style="margin-left: auto;">案件削除</button>
        ` : ''}
      </div>
    </div>
  `;

  screen.innerHTML = html;
}

/**
 * 案件削除確認
 */
function confirmDeleteProject(projectId) {
  if (confirm('この案件を削除しますか？\n削除すると元に戻すことはできません。')) {
    handleDeleteProject(projectId);
  }
}

/**
 * 案件削除処理
 */
async function handleDeleteProject(projectId) {
  const result = await deleteProject(projectId);

  if (result.success) {
    alert('案件を削除しました');
    showDashboard();
  } else {
    alert('削除に失敗しました: ' + result.message);
  }
}

/**
 * PDFを表示（案件詳細画面用）
 */
async function viewPdf(url) {
  console.log('PDF URL:', url);

  if (!url) {
    alert('PDFのURLが設定されていません');
    return;
  }

  // URLからファイルパスを抽出
  let filePath = url;
  if (url.includes('/storage/v1/object/public/estimates/')) {
    // 公開URLの場合、ファイルパスを抽出
    filePath = url.split('/storage/v1/object/public/estimates/')[1];
  } else if (url.includes('/storage/v1/object/sign/estimates/')) {
    // 署名付きURLの場合、ファイルパスを抽出
    filePath = url.split('/storage/v1/object/sign/estimates/')[1].split('?')[0];
  } else if (url.includes('estimates/')) {
    filePath = url.split('estimates/')[1];
  }

  console.log('File path:', filePath);

  try {
    // 署名付きURLを取得（1時間有効）
    const { data: signedUrlData, error } = await supabase.storage
      .from('estimates')
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Signed URL error:', error);
      alert('PDFの表示URLの取得に失敗しました');
      return;
    }

    console.log('Signed URL:', signedUrlData.signedUrl);

    // 新しいタブでPDFを開く
    window.open(signedUrlData.signedUrl, '_blank');
  } catch (error) {
    console.error('viewPdf error:', error);
    alert('PDFの表示に失敗しました');
  }
}

/**
 * 案件編集リスト画面
 */
async function showProjectEditList() {
  hideAllScreens();
  const screen = document.getElementById('project-search-screen');
  screen.classList.remove('hidden');

  const html = `
    <div class="card">
      <div class="detail-header">
        <h2>案件編集</h2>
      </div>

      <!-- 検索フォーム -->
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label>代理店名</label>
            <input type="text" id="edit-search-agency" placeholder="代理店名で検索">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>クライアント名</label>
            <select id="edit-search-client-id">
              <option value="">すべて</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label>案件名</label>
            <input type="text" id="edit-search-project-name" placeholder="案件名で検索">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label>メイン編集者</label>
            <select id="edit-search-main-editor">
              <option value="">すべて</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label>申請状況</label>
            <select id="edit-search-approval-status">
              <option value="">すべて</option>
              <option value="draft">下書き</option>
              <option value="rejected">差戻</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn btn-primary" onclick="searchEditableProjects()">検索</button>
          <button type="button" class="btn btn-secondary" onclick="clearProjectEditSearch()">クリア</button>
        </div>
      </div>

      <div id="edit-project-results" style="margin-top: 20px;">
        <div style="text-align: center; padding: 40px; color: #999;">検索条件を指定して「検索」ボタンを押してください</div>
      </div>
      <div style="margin-top: 20px;">
        <button type="button" class="btn btn-secondary" onclick="showDashboard()">TOPに戻る</button>
      </div>
    </div>
  `;

  screen.innerHTML = html;

  // マスタデータ読み込み
  await loadMasterData();

  // クライアントセレクトボックス
  const clientSelect = document.getElementById('edit-search-client-id');
  cachedMasterData.clients.forEach(client => {
    const option = document.createElement('option');
    option.value = client.client_id;
    option.textContent = client.client_name;
    clientSelect.appendChild(option);
  });

  // ユーザーセレクトボックス
  const userSelect = document.getElementById('edit-search-main-editor');
  cachedMasterData.users.forEach(user => {
    const option = document.createElement('option');
    option.value = user.user_id;
    option.textContent = user.name;
    userSelect.appendChild(option);
  });
}

/**
 * 案件編集検索クリア
 */
function clearProjectEditSearch() {
  document.getElementById('edit-search-agency').value = '';
  document.getElementById('edit-search-client-id').value = '';
  document.getElementById('edit-search-project-name').value = '';
  document.getElementById('edit-search-main-editor').value = '';
  document.getElementById('edit-search-approval-status').value = '';
  document.getElementById('edit-project-results').innerHTML =
    '<div style="text-align: center; padding: 40px; color: #999;">検索条件を指定して「検索」ボタンを押してください</div>';
}

/**
 * 編集可能案件検索
 */
async function searchEditableProjects() {
  const agency = document.getElementById('edit-search-agency').value;
  const clientId = document.getElementById('edit-search-client-id').value;
  const projectName = document.getElementById('edit-search-project-name').value;
  const mainEditor = document.getElementById('edit-search-main-editor').value;
  const approvalStatus = document.getElementById('edit-search-approval-status').value;

  const searchParams = {
    agency_name: agency || undefined,
    client_id: clientId || undefined,
    project_name: projectName || undefined,
    main_editor: mainEditor || undefined,
    status: approvalStatus || undefined
  };

  const resultsDiv = document.getElementById('edit-project-results');
  resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">検索中...</div>';

  const result = await searchProjects(searchParams);

  if (!result.success) {
    resultsDiv.innerHTML = `<div class="message error">${escapeHtml(result.message)}</div>`;
    return;
  }

  const projects = result.data || [];

  if (projects.length === 0) {
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">検索結果がありません</div>';
    return;
  }

  let html = `<p style="margin-bottom: 15px; font-weight: bold;">検索結果: ${projects.length}件</p>`;
  html += `
    <table class="results-table">
      <thead>
        <tr>
          <th>代理店名</th>
          <th>クライアント名</th>
          <th>案件名</th>
          <th>メイン編集者</th>
          <th>申請状況</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;

  projects.forEach(project => {
    const approvalStatusLabel =
      project.status === 'draft' ? '下書き' :
      (project.status === 'rejected' && project.leader_rejection_reason) ? '上長差戻' : project.status;

    html += `
      <tr>
        <td>${escapeHtml(project.agency_name || '-')}</td>
        <td>${escapeHtml(project.client_name || '-')}</td>
        <td>${escapeHtml(project.project_name)}</td>
        <td>${escapeHtml(project.main_editor_name || '-')}</td>
        <td>${createApprovalBadge(project.status)}</td>
        <td><button class="btn btn-primary btn-sm" onclick="showProjectDetail('${project.project_id}')">編集</button></td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  resultsDiv.innerHTML = html;
}

/**
 * 申請リスト画面
 */
async function showProjectSubmitList() {
  hideAllScreens();
  const screen = document.getElementById('project-search-screen');
  screen.classList.remove('hidden');

  const html = `
    <div class="card">
      <div class="card-header">
        <h2>申請</h2>
        <button class="btn btn-secondary" onclick="showDashboard()">メニューに戻る</button>
      </div>

      <div class="search-section">
        <h3>上長への申請</h3>
        <p>メイン編集者として登録されている案件を上長に申請できます。</p>

        <button class="btn btn-primary" onclick="searchSubmittableProjects()">申請可能な案件を表示</button>
      </div>

      <div id="submit-project-results"></div>
    </div>
  `;

  screen.innerHTML = html;
}

/**
 * 申請可能案件検索
 */
async function searchSubmittableProjects() {
  const user = getCurrentUser();

  const searchParams = {
    main_editor_id: user.id
  };

  const result = await searchProjects(searchParams);

  const resultsDiv = document.getElementById('submit-project-results');

  if (!result.success) {
    resultsDiv.innerHTML = `<div class="message error">${escapeHtml(result.message)}</div>`;
    return;
  }

  if (result.data.length === 0) {
    resultsDiv.innerHTML = '<div class="message info">申請可能な案件がありません</div>';
    return;
  }

  let html = `
    <h3>申請可能案件（${result.data.length}件）</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>案件ID</th>
          <th>クライアント</th>
          <th>案件名</th>
          <th>納期</th>
          <th>ステータス</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;

  result.data.forEach(project => {
    html += `
      <tr>
        <td>${escapeHtml(project.id)}</td>
        <td>${escapeHtml(project.client_name)}</td>
        <td>${escapeHtml(project.project_name)}</td>
        <td>${formatDate(project.deadline)}</td>
        <td>${createStatusBadge(project.status)}</td>
        <td><button class="btn btn-primary btn-sm" onclick="showProjectDetail('${project.id}')">詳細・申請</button></td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  resultsDiv.innerHTML = html;
}

/**
 * フィードバック一覧画面
 */
async function showFeedbackList() {
  hideAllScreens();
  const screen = document.getElementById('project-search-screen');
  screen.classList.remove('hidden');

  const html = `
    <div class="card">
      <div class="card-header">
        <h2>上長からのフィードバック</h2>
        <button class="btn btn-secondary" onclick="showDashboard()">メニューに戻る</button>
      </div>

      <div class="search-section">
        <h3>承認済み案件のフィードバック</h3>
        <p>過去2ヶ月間に上長承認された案件のフィードバックを確認できます。</p>

        <button class="btn btn-primary" onclick="searchApprovedProjects()">承認済み案件を表示</button>
      </div>

      <div id="feedback-results"></div>
    </div>
  `;

  screen.innerHTML = html;
}

/**
 * 承認済み案件検索（フィードバック用）
 */
async function searchApprovedProjects() {
  const user = getCurrentUser();

  // 過去2ヶ月の日付を計算
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const searchParams = {
    main_editor_id: user.id,
    status: 'leader_approved'
  };

  const result = await searchProjects(searchParams);

  const resultsDiv = document.getElementById('feedback-results');

  if (!result.success) {
    resultsDiv.innerHTML = `<div class="message error">${escapeHtml(result.message)}</div>`;
    return;
  }

  // 過去2ヶ月でフィルタ
  const recentProjects = result.data.filter(project => {
    if (!project.leader_approved_at) return false;
    const approvedDate = new Date(project.leader_approved_at);
    return approvedDate >= twoMonthsAgo;
  });

  if (recentProjects.length === 0) {
    resultsDiv.innerHTML = '<div class="message info">過去2ヶ月間に承認された案件がありません</div>';
    return;
  }

  let html = `
    <h3>承認済み案件（${recentProjects.length}件）</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>案件ID</th>
          <th>クライアント</th>
          <th>案件名</th>
          <th>承認日</th>
          <th>承認者</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;

  recentProjects.forEach(project => {
    html += `
      <tr>
        <td>${escapeHtml(project.id)}</td>
        <td>${escapeHtml(project.client_name)}</td>
        <td>${escapeHtml(project.project_name)}</td>
        <td>${formatDate(project.leader_approved_at)}</td>
        <td>${escapeHtml(project.assigned_leader_name || '')}</td>
        <td><button class="btn btn-primary btn-sm" onclick="showProjectDetail('${project.id}')">詳細・フィードバック</button></td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  resultsDiv.innerHTML = html;
}

/**
 * 分析画面（未実装）
 */
function showAnalysis() {
  hideAllScreens();
  const screen = document.getElementById('project-search-screen');
  screen.classList.remove('hidden');

  const html = `
    <div class="card">
      <div class="card-header">
        <h2>分析</h2>
        <button class="btn btn-secondary" onclick="showDashboard()">メニューに戻る</button>
      </div>

      <div class="message info">
        <h3>統計・分析機能</h3>
        <p>この機能は今後実装予定です。</p>
        <p>以下のような機能を予定しています：</p>
        <ul>
          <li>月次・年次の案件数推移グラフ</li>
          <li>編集者別の作業時間統計</li>
          <li>クライアント別の案件数・売上分析</li>
          <li>ジャンル別の案件分布</li>
          <li>目標時間と実績時間の比較分析</li>
        </ul>
      </div>
    </div>
  `;

  screen.innerHTML = html;
}
