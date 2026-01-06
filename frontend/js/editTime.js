// ========================================
// 編集時間登録画面
// ========================================

let inProgressProjects = [];

/**
 * 編集時間登録画面表示
 */
async function showEditTimeRegistration() {
  hideAllScreens();
  const screen = document.getElementById('edit-time-registration-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('edit-time-registration');

  showLoading('edit-time-registration-screen');

  // マスタデータと進行中案件を読み込み
  await loadMasterData();
  const result = await getInProgressProjects();

  if (!result.success) {
    showError('edit-time-registration-screen', result.message);
    return;
  }

  inProgressProjects = result.data || [];

  if (inProgressProjects.length === 0) {
    screen.innerHTML = `
      <div class="card">
        <h2>編集時間登録</h2>
        ${createBackButton('showDashboard()')}
        <div class="message error">進行中の案件がありません</div>
      </div>
    `;
    return;
  }

  // 今日の日付を取得
  const today = new Date();
  const dateStr = formatDate(today);

  const user = getCurrentUser();

  const html = `
    <div class="card">
      <h2>編集時間登録</h2>
      ${createBackButton('showDashboard()')}

      <form id="edit-time-form">
        <div class="form-group">
          <label>作業日 <span style="color: red;">*</span></label>
          <input type="date" id="edit-date" value="${dateStr}" required>
        </div>

        <div class="form-group">
          <label>編集者</label>
          <input type="text" id="edit-editor" value="${user.name}" disabled style="background: #f0f0f0;">
        </div>

        <h3 style="margin-top: 20px; margin-bottom: 10px;">案件別編集時間</h3>
        <div id="project-edit-time-list"></div>
        <button type="button" class="add-row-btn" onclick="addProjectEditRow()">+ 案件追加</button>

        <div style="margin-top: 20px; font-weight: bold;">
          本日の編集時間 合計: <span id="totalEditTime">0時間0分</span>
        </div>

        <div class="btn-group">
          <button type="button" class="btn btn-secondary" onclick="showDashboard()">戻る</button>
          <button type="submit" class="btn btn-primary">登録</button>
        </div>
        <div id="edit-time-message"></div>
      </form>
    </div>
  `;

  screen.innerHTML = html;

  // フォーム送信イベント
  document.getElementById('edit-time-form').onsubmit = async function(e) {
    e.preventDefault();
    await handleEditTimeSubmit();
    return false;
  };

  // 初期案件行を追加
  addProjectEditRow();
}

/**
 * 案件編集行を追加
 */
function addProjectEditRow() {
  const container = document.getElementById('project-edit-time-list');
  const rowIndex = container.children.length + 1;

  const rowDiv = document.createElement('div');
  rowDiv.className = 'project-edit-row';

  // クライアントリストを作成（重複なし）
  const clientGroups = {};
  inProgressProjects.forEach(project => {
    // UUIDで検索（idカラム）
    const client = cachedMasterData.clients.find(c => c.id === project.client_id);
    if (client && !clientGroups[client.id]) {
      clientGroups[client.id] = client.client_name;
    }
  });

  let clientOptionsHtml = '<option value="">選択してください</option>';
  Object.keys(clientGroups).forEach(clientId => {
    clientOptionsHtml += `<option value="${clientId}">${escapeHtml(clientGroups[clientId])}</option>`;
  });

  rowDiv.innerHTML = `
    <h4>案件 ${rowIndex}
      <button type="button" class="remove-row-btn" onclick="removeProjectRow(this)">削除</button>
    </h4>
    <div class="form-group">
      <label>クライアント名</label>
      <select class="project-client" onchange="loadProjectsByClientForRow(this)">
        ${clientOptionsHtml}
      </select>
    </div>
    <div class="form-group">
      <label>案件名 <span style="color: red;">*</span></label>
      <select class="project-name" onchange="displayProjectSummary(this)" required>
        <option value="">クライアントを選択してください</option>
      </select>
    </div>
    <div class="project-summary" style="display: none;"></div>
    <div class="form-group">
      <label>編集履歴</label>
      <div class="edit-history-container"></div>
      <button type="button" class="add-row-btn" onclick="addEditHistoryRowToProject(this)">+ 履歴追加</button>
    </div>
  `;

  container.appendChild(rowDiv);

  // 初期編集履歴行を追加
  const addButton = rowDiv.querySelector('.add-row-btn');
  if (addButton) {
    addEditHistoryRowToProject(addButton);
  }
}

/**
 * 案件行を削除
 */
function removeProjectRow(btn) {
  btn.closest('.project-edit-row').remove();
  renumberProjectRows();
}

/**
 * 案件番号を振り直し
 */
function renumberProjectRows() {
  const rows = document.querySelectorAll('.project-edit-row');
  rows.forEach((row, index) => {
    row.querySelector('h4').firstChild.textContent = `案件 ${index + 1} `;
  });
}

/**
 * クライアント選択で案件リストを更新
 */
function loadProjectsByClientForRow(selectElement) {
  const clientId = selectElement.value;
  const row = selectElement.closest('.project-edit-row');
  const projectSelect = row.querySelector('.project-name');

  projectSelect.innerHTML = '<option value="">選択してください</option>';

  if (!clientId) {
    return;
  }

  const filteredProjects = inProgressProjects.filter(p => p.client_id === clientId);

  filteredProjects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.project_id;
    option.textContent = project.project_name || project.name || '（案件名なし）';
    projectSelect.appendChild(option);
  });
}

/**
 * 案件選択で概要を表示
 */
async function displayProjectSummary(selectElement) {
  const projectId = selectElement.value;
  const row = selectElement.closest('.project-edit-row');
  const summaryDiv = row.querySelector('.project-summary');

  if (!projectId) {
    summaryDiv.style.display = 'none';
    row.dataset.targetMinutes = '0';
    row.dataset.baseActualMinutes = '0';
    return;
  }

  // ローディング表示
  summaryDiv.innerHTML = '<div style="text-align: center; padding: 10px; color: #999;">読み込み中...</div>';
  summaryDiv.style.display = 'block';

  // APIから案件詳細を取得
  const result = await getProjectDetail(projectId);

  if (!result.success) {
    summaryDiv.innerHTML = '<div style="text-align: center; padding: 10px; color: #f44336;">データの取得に失敗しました</div>';
    return;
  }

  const project = result.data;

  // データ属性に基準値を保存（分単位）
  row.dataset.targetMinutes = project.target_hours || 0;
  row.dataset.baseActualMinutes = project.total_edit_hours || 0;

  // 時間カードと編集履歴を更新
  updateProjectRowTimeSummary(row);
  displayEditHistory(row, project);
}

/**
 * 案件行の時間サマリーを更新
 */
function updateProjectRowTimeSummary(row) {
  const summaryDiv = row.querySelector('.project-summary');
  if (!summaryDiv) return;

  const targetMinutes = parseFloat(row.dataset.targetMinutes) || 0;
  const baseActualMinutes = parseFloat(row.dataset.baseActualMinutes) || 0;

  // 現在行の入力時間を計算
  const currentInputMinutes = calculateCurrentRowMinutes(row);

  // 合計実働時間 = 既存の実働時間 + 今回入力する時間
  const totalActualMinutes = baseActualMinutes + currentInputMinutes;

  // 時間を計算
  const targetHours = Math.floor(targetMinutes / 60);
  const targetMins = Math.round(targetMinutes % 60);

  const actualHours = Math.floor(totalActualMinutes / 60);
  const actualMins = Math.round(totalActualMinutes % 60);

  const diff = totalActualMinutes - targetMinutes;
  const diffHours = Math.floor(Math.abs(diff) / 60);
  const diffMins = Math.round(Math.abs(diff) % 60);
  const diffSign = diff >= 0 ? '+' : '-';
  const diffClass = diff >= 0 ? 'over' : '';

  // 既存の編集履歴HTMLを保存
  const existingHistoryDiv = summaryDiv.querySelector('.existing-edit-history');
  const historyHtml = existingHistoryDiv ? existingHistoryDiv.outerHTML : '';

  summaryDiv.innerHTML = `
    <div class="time-highlight-cards">
      <div class="time-highlight-card">
        <label>編集目標時間</label>
        <div class="value">${targetHours}時間${targetMins}分</div>
      </div>
      <div class="time-highlight-card">
        <label>実働編集時間</label>
        <div class="value">${actualHours}時間${actualMins}分</div>
      </div>
      <div class="time-highlight-card">
        <label>目標と実働の差</label>
        <div class="value ${diffClass}">${diffSign}${diffHours}時間${diffMins}分</div>
      </div>
    </div>
    ${historyHtml}
  `;
  summaryDiv.style.display = 'block';
}

/**
 * 編集履歴を表示
 */
function displayEditHistory(row, project) {
  const summaryDiv = row.querySelector('.project-summary');
  if (!summaryDiv) return;

  // 編集履歴がない場合
  if (!project.edit_history || project.edit_history.length === 0) {
    return;
  }

  // 編集履歴テーブルを追加
  let historyHtml = `
    <div class="existing-edit-history" style="margin-top: 20px; background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #ddd;">
      <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">既存の編集時間履歴</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
            <th style="padding: 8px; text-align: left;">日付</th>
            <th style="padding: 8px; text-align: left;">項目</th>
            <th style="padding: 8px; text-align: right;">時間</th>
            <th style="padding: 8px; text-align: left;">編集者</th>
            <th style="padding: 8px; text-align: left;">メモ</th>
          </tr>
        </thead>
        <tbody>
  `;

  project.edit_history.forEach(h => {
    const totalMinutes = h.edit_time || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeDisplay = `${hours}:${String(minutes).padStart(2, '0')}`;

    historyHtml += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 6px;">${h.date || '-'}</td>
        <td style="padding: 6px;">${escapeHtml(h.edit_item_name || '-')}</td>
        <td style="padding: 6px; text-align: right;">${timeDisplay}</td>
        <td style="padding: 6px;">${escapeHtml(h.editor_name || '-')}</td>
        <td style="padding: 6px;">${escapeHtml(h.memo || '-')}</td>
      </tr>
    `;
  });

  historyHtml += `
        </tbody>
      </table>
    </div>
  `;

  // 既存のサマリーの後に履歴を追加
  const currentContent = summaryDiv.innerHTML;
  summaryDiv.innerHTML = currentContent + historyHtml;
}

/**
 * 現在行の入力時間を計算（分単位）
 */
function calculateCurrentRowMinutes(row) {
  let totalMinutes = 0;
  const historyRows = row.querySelectorAll('.edit-history-row');

  historyRows.forEach(historyRow => {
    const hoursInput = historyRow.querySelector('.edit-hours');
    const minutesInput = historyRow.querySelector('.edit-minutes');
    const hours = parseInt(hoursInput?.value) || 0;
    const minutes = parseInt(minutesInput?.value) || 0;
    totalMinutes += (hours * 60) + minutes;
  });

  return totalMinutes;
}

/**
 * 編集履歴行を追加
 */
function addEditHistoryRowToProject(btn) {
  const row = btn.closest('.project-edit-row');
  const container = row.querySelector('.edit-history-container');

  const historyRow = document.createElement('div');
  historyRow.className = 'edit-history-row';

  let editItemsHtml = '<option value="">選択してください</option>';
  cachedMasterData.estimateItems.forEach(item => {
    editItemsHtml += `<option value="${item.estimate_item_id}">${escapeHtml(item.estimate_item_name)}</option>`;
  });

  historyRow.innerHTML = `
    <select class="edit-item" required>
      ${editItemsHtml}
    </select>
    <input type="number" class="edit-hours" placeholder="時" min="0" required>
    <input type="number" class="edit-minutes" placeholder="分" min="0" max="59" required>
    <input type="text" class="edit-memo" placeholder="メモ(任意)">
    <button type="button" class="remove-row-btn" onclick="removeEditHistoryRow(this)">削除</button>
  `;

  container.appendChild(historyRow);

  // 時間入力フィールドにイベントリスナーを追加
  const hoursInput = historyRow.querySelector('.edit-hours');
  const minutesInput = historyRow.querySelector('.edit-minutes');
  hoursInput.addEventListener('input', function() {
    updateProjectRowTimeSummary(row);
    calculateTotalEditTime();
  });
  minutesInput.addEventListener('input', function() {
    updateProjectRowTimeSummary(row);
    calculateTotalEditTime();
  });
}

/**
 * 編集履歴行を削除
 */
function removeEditHistoryRow(button) {
  const row = button.closest('.project-edit-row');
  button.parentElement.remove();
  updateProjectRowTimeSummary(row);
  calculateTotalEditTime();
}

/**
 * 全案件の編集時間合計を計算
 */
function calculateTotalEditTime() {
  let totalMinutes = 0;
  const projectRows = document.querySelectorAll('.project-edit-row');

  projectRows.forEach(row => {
    totalMinutes += calculateCurrentRowMinutes(row);
  });

  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);

  const totalElement = document.getElementById('totalEditTime');
  if (totalElement) {
    totalElement.textContent = `${hours}時間${mins}分`;
  }
}

/**
 * 編集時間登録処理
 */
async function handleEditTimeSubmit() {
  const editDate = document.getElementById('edit-date').value;
  const user = getCurrentUser();

  if (!editDate) {
    showMessage('edit-time-message', '日付を入力してください', 'error');
    return;
  }

  // 案件ごとのデータ収集
  const projectRows = document.querySelectorAll('.project-edit-row');
  const projectEditData = [];

  for (const row of projectRows) {
    const projectSelect = row.querySelector('.project-name');
    const projectId = projectSelect.value;

    if (!projectId) {
      showMessage('edit-time-message', 'すべての案件を選択してください', 'error');
      return;
    }

    const historyRows = row.querySelectorAll('.edit-history-row');
    if (historyRows.length === 0) {
      showMessage('edit-time-message', 'すべての案件に編集履歴を追加してください', 'error');
      return;
    }

    const editHistory = [];
    for (const historyRow of historyRows) {
      const editItemId = historyRow.querySelector('.edit-item').value;
      const hours = parseInt(historyRow.querySelector('.edit-hours').value) || 0;
      const minutes = parseInt(historyRow.querySelector('.edit-minutes').value) || 0;
      const editMemo = historyRow.querySelector('.edit-memo').value;

      if (!editItemId || (hours === 0 && minutes === 0)) {
        showMessage('edit-time-message', 'すべての編集項目と時間を入力してください', 'error');
        return;
      }

      // 時間を10進数に変換（例: 1時間30分 = 1.5時間）
      const totalMinutes = (hours * 60) + minutes;
      const decimalHours = totalMinutes / 60;

      editHistory.push({
        estimate_item_id: editItemId,
        edit_hours: decimalHours,
        edit_memo: editMemo
      });
    }

    projectEditData.push({
      project_id: projectId,
      edit_history: editHistory
    });
  }

  const editTimeData = {
    edit_date: editDate,
    editor_id: user.user_id,
    project_edits: projectEditData
  };

  showMessage('edit-time-message', '登録中...', 'success');

  const result = await saveEditTime(editTimeData);

  if (result.success) {
    showMessage('edit-time-message', result.message, 'success');

    setTimeout(() => {
      showDashboard();
    }, 2000);
  } else {
    showMessage('edit-time-message', result.message, 'error');
  }
}
