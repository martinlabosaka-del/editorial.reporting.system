// 現在編集中のプロジェクトデータを保持
let currentEditingProject = null;

// マイルストーン工程タイプのキャッシュ
let currentMilestoneTypes = [];

/**
 * 案件詳細編集画面
 */
async function showProjectEditScreen(projectId) {
  hideAllScreens();
  const screen = document.getElementById('project-edit-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('project-edit', { projectId });

  showLoading('project-edit-screen');

  // マスタデータとプロジェクトデータを読み込み
  await loadMasterData();
  const [result, milestonesResult, typesResult] = await Promise.all([
    getProjectDetail(projectId),
    getProjectMilestones(projectId),
    getMilestoneTypes()
  ]);

  if (!result.success) {
    showError('project-edit-screen', result.message);
    return;
  }

  const project = result.data;
  const milestones = milestonesResult.success ? milestonesResult.data : [];
  currentMilestoneTypes = typesResult.success ? typesResult.data : [];
  currentEditingProject = project; // プロジェクトデータを保存

  const html = `
    <div class="card">
      <div class="detail-header">
        <h2>案件編集</h2>
        <div class="detail-meta">
          <div><strong>案件番号:</strong> ${escapeHtml(project.project_id)}</div>
          <div><strong>登録日:</strong> ${project.registration_date || '-'}</div>
        </div>
      </div>

      <form id="project-edit-form">
        <input type="hidden" id="edit-project-id" value="${escapeHtml(project.project_id)}">

        <!-- 基本情報 -->
        <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">基本情報</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label>代理店名</label>
            <input type="text" id="edit-agency-name" value="${escapeHtml(project.agency_name || '')}" disabled style="background: #f5f5f5;">
          </div>
          <div class="form-group">
            <label>クライアント名</label>
            <select id="edit-client-id" disabled style="background: #f5f5f5;">
              ${createSelectOptions(cachedMasterData.clients, 'client_id', 'client_name', project.client_id_text)}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>案件名 <span style="color: red;">*</span></label>
          <input type="text" id="edit-project-name" value="${escapeHtml(project.project_name)}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label>納品予定日 <span style="color: red;">*</span></label>
            <input type="date" id="edit-delivery-date" value="${project.delivery_date || ''}" required>
          </div>
          <div class="form-group">
            <label>納品日</label>
            <input type="date" id="edit-actual-delivery-date" value="${project.actual_delivery_date || ''}">
          </div>
        </div>

        <!-- 担当者 -->
        <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">担当者</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label>メイン編集者 <span style="color: red;">*</span></label>
            <select id="edit-main-editor" required>
              ${createSelectOptions(cachedMasterData.editors, 'user_id', 'name', project.main_editor_id)}
            </select>
          </div>
          <div class="form-group">
            <label>ディレクター</label>
            <select id="edit-director" onchange="toggleExternalDirectorName('edit-director', 'edit-external-director-name')">
              ${createDirectorOptions(cachedMasterData.editors, project.director_id)}
            </select>
            <input type="text" id="edit-external-director-name" placeholder="外部ディレクター名（任意）"
              value="${escapeHtml(project.external_director_name || '')}"
              style="display: ${project.is_external_director ? 'block' : 'none'}; margin-top: 8px;">
          </div>
        </div>

        <div class="form-group">
          <label>サブ編集者</label>
          <div class="multi-select" id="edit-sub-editors">
            ${createCheckboxes(cachedMasterData.editors, 'user_id', 'name', project.sub_editors || [])}
          </div>
        </div>

        <!-- ジャンル及び使用技術 -->
        <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">ジャンル 及び 使用技術</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label>映像ジャンル</label>
            <div class="multi-select" id="edit-genres">
              ${createCheckboxes(cachedMasterData.genres, 'genre_id', 'genre_name', project.genres || [])}
            </div>
          </div>
          <div class="form-group">
            <label>使用技術</label>
            <div class="multi-select" id="edit-technologies">
              ${createCheckboxes(cachedMasterData.technologies, 'tech_id', 'tech_name', project.technologies || [])}
            </div>
          </div>
        </div>

        <!-- 完成データ保管場所 -->
        <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">完成データ保管場所 及び サンプルムービー視聴URL</h3>

        <div class="form-group">
          <label>完成データ保管場所</label>
          <input type="text" id="edit-file-storage-url" value="${escapeHtml(project.file_storage_url || '')}" placeholder="例：Googleドライブ > プロジェクト > 2025 > 案件名">
        </div>

        <div class="form-group">
          <label>サンプルムービー視聴URL</label>
          <div id="edit-completed-urls-list"></div>
          <button type="button" class="add-row-btn" onclick="addEditCompletedUrlRow()">+ URL追加</button>
        </div>

        <!-- お見積り及び編集費内訳 -->
        <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">お見積り 及び 編集費内訳</h3>

        <div class="form-group">
          <label>見積番号</label>
          <input type="text" id="edit-estimate-number" value="${escapeHtml(project.estimate_number || '')}" placeholder="例：EST-2025-001">
        </div>

        <div class="form-group">
          <label>お見積りPDF</label>
          <input type="file" id="edit-pdf-file" accept=".pdf">
          <div id="edit-pdf-upload-status" style="margin-top: 10px; color: #666;"></div>
          ${project.estimate_pdf_url ? `
            <div style="margin-top: 10px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="viewPdf('${escapeHtml(project.estimate_pdf_url)}')">現在のPDFを表示</button>
            </div>
          ` : ''}
        </div>

        <div class="form-group">
          <label>見積合計金額</label>
          <input type="number" id="edit-estimate-grand-total"
                 value="${project.estimate_grand_total != null ? Math.round(project.estimate_grand_total) : ''}"
                 placeholder="例：500000" min="0" step="1">
          <small style="color: #666;">
            見積書全体の合計金額を入力してください。
          </small>
        </div>

        <div class="form-group">
          <label>編集費内訳 <span style="color: red;">*</span></label>
          <div id="edit-estimate-breakdown"></div>
          <button type="button" class="add-row-btn" onclick="addEditEstimateRow()">+ 行追加</button>
        </div>

        <div class="form-group">
          <div class="calc-result">
            編集費合計金額: <span id="edit-estimate-total">0円</span>
          </div>
        </div>

        <!-- 進捗マイルストーン -->
        <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">進捗マイルストーン</h3>
        <div id="edit-milestones-header" style="display:flex;gap:10px;margin-bottom:6px;align-items:center;font-size:12px;font-weight:bold;color:#666;">
          <span style="min-width:60px;">順序</span>
          <span style="min-width:70px;">回数</span>
          <span style="min-width:280px;">工程</span>
          <span id="milestone-reviewer-header" style="min-width:140px;">上長確認者</span>
          <span style="min-width:160px;">メモ</span>
          <span style="min-width:140px;">予定日</span>
          <span style="min-width:140px;">完了日</span>
          <span style="min-width:50px;"></span>
        </div>
        <div id="edit-milestones-list"></div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button type="button" class="add-row-btn" onclick="addEditMilestoneRow()">+ 工程追加</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="handleAddMilestoneType()">+ 工程タイプ追加</button>
        </div>

        <!-- 編集目標時間と実働編集時間 -->
        <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">編集目標時間と実働編集時間</h3>

        <div class="time-highlight-cards">
          <div class="time-highlight-card">
            <label>編集目標時間（自動計算）</label>
            <div class="value" id="edit-target-hours">0時間0分</div>
          </div>
          <div class="time-highlight-card">
            <label>実働編集時間（自動計算）</label>
            <div class="value" id="edit-actual-hours">0時間0分</div>
          </div>
          <div class="time-highlight-card">
            <label>目標と実働の差</label>
            <div class="value" id="edit-time-diff">0時間0分</div>
          </div>
        </div>

        <!-- 編集時間履歴 -->
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">編集時間履歴</h3>
          <div id="edit-time-history"></div>
        </div>

        <div class="form-group">
          <label>編集時間追加</label>
          <div id="edit-time-add-section"></div>
          <button type="button" class="add-row-btn" onclick="addEditTimeRowInEdit()">+ 編集時間を追加</button>
        </div>

        <!-- メイン編集者コメント -->
        <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">メイン編集者コメント</h3>

        <div class="form-group">
          <label>編集作業を終えての振り返り <span style="color: red;">*</span></label>
          <textarea id="edit-reflection" required placeholder="例：編集を通じて、After Effects のコンポジション構成に対する理解が深まりました。" style="min-height: 100px;">${escapeHtml(project.reflection || '')}</textarea>
        </div>

        <div class="form-group">
          <label>上長に共有したいこと・サポートしてほしい点 <span style="color: red;">*</span></label>
          <textarea id="edit-main-editor-message" required placeholder="例：編集前にもう少し素材の意図や構成の説明があると助かります。" style="min-height: 100px;">${escapeHtml(project.main_editor_message || '')}</textarea>
        </div>

        <div class="form-group">
          <label>その他気づいた点など（任意）</label>
          <textarea id="edit-other-notes" placeholder="その他、気づいた点や共有したいことがあれば記入してください" style="min-height: 80px;">${escapeHtml(project.other_notes || '')}</textarea>
        </div>

        <div class="form-group">
          <label>申請上長選択 <span style="color: red;">*</span></label>
          <select id="edit-assigned-leader" required>
            ${createSelectOptions(cachedMasterData.users.filter(u => u.role === 'leader'), 'user_id', 'name', project.assigned_leader)}
          </select>
        </div>

        <!-- 上長からのフィードバック -->
        ${project.leader_message ? `
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">上長からのフィードバック</h3>
            <div style="padding: 8px; background: white; border: 1px solid #ddd; border-radius: 4px; min-height: 60px; white-space: pre-wrap;">${escapeHtml(project.leader_message)}</div>
          </div>
        ` : ''}

        <div class="btn-group">
          <button type="button" class="btn btn-secondary" onclick="showProjectDetail('${project.project_id}')">キャンセル</button>
          <button type="button" class="btn btn-secondary" onclick="saveProjectEdit()">保存</button>
          <button type="button" class="btn btn-primary" onclick="submitProjectToLeader()">上長に申請</button>
        </div>
        <div id="project-edit-message"></div>
      </form>
    </div>
  `;

  screen.innerHTML = html;

  // マイルストーンを復元
  // 0件のときも空行を1本出す（見積内訳と同じ挙動）。
  // 何も無いと入力欄の存在に気づかず、工程が未登録のままになりやすいため。
  if (milestones.length > 0) {
    milestones.forEach(m => {
      addEditMilestoneRow({ id: m.id, name: m.milestone_name, planned_date: m.planned_date || '', completed_date: m.completed_date || '', confirmed_by: m.confirmed_by || '', memo: m.memo || '' });
    });
  } else {
    addEditMilestoneRow();
  }

  // 見積内訳を復元
  if (project.estimate_breakdown && project.estimate_breakdown.length > 0) {
    project.estimate_breakdown.forEach(item => {
      // edit_item_idとamountを持つオブジェクトを渡す
      const rowData = {
        edit_item_id: item.edit_item ? item.edit_item.edit_item_id : item.edit_item_id,
        amount: item.amount
      };
      addEditEstimateRow(rowData);
    });
  } else {
    addEditEstimateRow();
  }

  // 完成URL復元
  if (project.completed_urls && project.completed_urls.length > 0) {
    project.completed_urls.forEach(url => {
      addEditCompletedUrlRow(url);
    });
  } else {
    addEditCompletedUrlRow();
  }

  // 編集時間履歴を表示
  displayEditTimeHistory(project);

  // 実働時間を計算して表示
  const actualMinutes = project.total_edit_hours || 0;
  const actualHours = Math.floor(actualMinutes / 60);
  const actualMins = actualMinutes % 60;
  document.getElementById('edit-actual-hours').textContent = `${actualHours}時間${actualMins}分`;

  // グローバル変数に保存（差分計算用）
  window.currentProjectActualMinutes = actualMinutes;

  calculateEditEstimateTotal();
}

/**
 * マイルストーン名を解析して工程タイプと番号に分解
 */
function parseMilestoneName(name) {
  if (!name) return { type: '', number: '' };

  const typeNames = currentMilestoneTypes.map(t => t.type_name);

  // 稿タイプ特殊処理: 初稿, 2稿, 3稿, 最終稿...
  if (typeNames.includes('稿') && name.endsWith('稿') && name !== '稿') {
    const prefix = name.slice(0, -1);
    if (prefix === '初') {
      return { type: '稿', number: '1' };
    }
    if (prefix === '最終') {
      return { type: '稿', number: 'final' };
    }
    if (/^\d+$/.test(prefix)) {
      return { type: '稿', number: prefix };
    }
  }

  // 番号付きの既知タイプ（例: 社内確認2, 修正3, 修正(最終)）
  for (const typeName of typeNames) {
    if (name === typeName) {
      return { type: typeName, number: '' };
    }
    if (name === typeName + '(最終)') {
      return { type: typeName, number: 'final' };
    }
    if (name.startsWith(typeName)) {
      const suffix = name.slice(typeName.length);
      if (/^\d+$/.test(suffix)) {
        return { type: typeName, number: suffix };
      }
    }
  }

  // その他
  return { type: 'other', customName: name };
}

/**
 * マイルストーン行追加（編集画面用）
 */
function addEditMilestoneRow(data = null) {
  const container = document.getElementById('edit-milestones-list');
  const row = document.createElement('div');
  row.className = 'milestone-edit-row';
  row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px; align-items: center;';

  // 既存レコードのidを行に持たせる。
  // 保存時にこのidで「更新する行」と「新しく追加された行」を見分ける。
  // 画面で追加した行にはidが無いので、そのままINSERT対象になる。
  if (data && data.id) {
    row.dataset.milestoneId = data.id;
  }

  // 既存データの解析
  let parsed = { type: '', number: '' };
  if (data && data.name) {
    parsed = parseMilestoneName(data.name);
  }

  // 工程タイプのオプション生成
  let typeOptions = '<option value="">工程を選択</option>';
  currentMilestoneTypes.forEach(t => {
    const selected = t.type_name === parsed.type ? 'selected' : '';
    typeOptions += `<option value="${escapeHtml(t.type_name)}" ${selected}>${escapeHtml(t.type_name)}</option>`;
  });
  const otherSelected = parsed.type === 'other' ? 'selected' : '';
  typeOptions += `<option value="other" ${otherSelected}>その他</option>`;

  // 番号オプション生成
  const numbers = [
    { value: '', label: 'なし' },
    { value: '1', label: '初稿' },
    { value: '2', label: '2稿' },
    { value: '3', label: '3稿' },
    { value: '4', label: '4稿' },
    { value: '5', label: '5稿' },
    { value: '6', label: '6稿' },
    { value: '7', label: '7稿' },
    { value: '8', label: '8稿' },
    { value: 'final', label: '最終稿' }
  ];
  const numberOptions = numbers.map(n => {
    const selected = n.value === parsed.number ? 'selected' : '';
    return `<option value="${n.value}" ${selected}>${n.label}</option>`;
  }).join('');

  const showCustom = parsed.type === 'other' ? '' : 'display:none;';

  // 確認者プルダウン（リーダー以上）
  const leaders = cachedMasterData.users.filter(u => u.is_editor && (u.role === 'leader' || u.role === 'executive') && u.is_active);
  let reviewerOptions = '<option value="">選択</option>';
  leaders.forEach(u => {
    const selected = data && data.confirmed_by === u.id ? 'selected' : '';
    reviewerOptions += `<option value="${u.id}" ${selected}>${escapeHtml(u.name)}</option>`;
  });

  const isReviewType = parsed.type === '社内確認';
  const showReviewer = isReviewType ? '' : 'visibility:hidden;';

  row.innerHTML = `
    <span style="display:flex;gap:2px;min-width:60px;">
      <button type="button" class="btn btn-sm" style="padding:2px 6px;font-size:14px;" onclick="moveMilestoneRow(this, -1)">↑</button>
      <button type="button" class="btn btn-sm" style="padding:2px 6px;font-size:14px;" onclick="moveMilestoneRow(this, 1)">↓</button>
    </span>
    <select class="milestone-number" style="min-width:70px;">
      ${numberOptions}
    </select>
    <span class="milestone-type-container" style="display:flex;gap:4px;min-width:280px;width:280px;">
      <select class="milestone-type" onchange="onMilestoneTypeChange(this)" style="flex:1;">
        ${typeOptions}
      </select>
      <input type="text" class="milestone-custom" placeholder="工程名を入力" value="${parsed.customName ? escapeHtml(parsed.customName) : ''}" style="flex:1;${showCustom}">
    </span>
    <select class="milestone-reviewer" style="min-width:140px;${showReviewer}">
      ${reviewerOptions}
    </select>
    <input type="text" class="milestone-memo" placeholder="" value="${data && data.memo ? escapeHtml(data.memo) : ''}" style="min-width:160px;">
    <input type="date" class="milestone-planned-date" value="${data ? data.planned_date : ''}" style="min-width:140px;">
    <input type="date" class="milestone-completed-date" value="${data ? data.completed_date : ''}" style="min-width:140px;">
    <button type="button" class="remove-row-btn" onclick="this.parentElement.remove();">削除</button>
  `;

  container.appendChild(row);
}

/**
 * 工程タイプ変更時の処理
 */
function onMilestoneTypeChange(select) {
  const row = select.closest('.milestone-edit-row');
  const customInput = row.querySelector('.milestone-custom');
  const reviewerSelect = row.querySelector('.milestone-reviewer');

  customInput.style.display = select.value === 'other' ? '' : 'none';
  reviewerSelect.style.visibility = select.value === '社内確認' ? '' : 'hidden';
}

/**
 * マイルストーン行の順番を入れ替え
 * @param {HTMLElement} btn - クリックされたボタン
 * @param {number} direction - -1: 上へ, 1: 下へ
 */
function moveMilestoneRow(btn, direction) {
  const row = btn.closest('.milestone-edit-row');
  const container = document.getElementById('edit-milestones-list');
  if (direction === -1 && row.previousElementSibling) {
    container.insertBefore(row, row.previousElementSibling);
  } else if (direction === 1 && row.nextElementSibling) {
    container.insertBefore(row.nextElementSibling, row);
  }
}

/**
 * マイルストーン行から工程名を取得
 */
function getMilestoneNameFromRow(row) {
  const type = row.querySelector('.milestone-type').value;
  if (!type) return '';

  if (type === 'other') {
    return row.querySelector('.milestone-custom').value.trim();
  }

  const num = row.querySelector('.milestone-number').value;

  // 稿タイプの特殊処理
  if (type === '稿' && num) {
    if (num === '1') return '初稿';
    if (num === 'final') return '最終稿';
    return num + '稿';
  }

  // 番号なし
  if (!num) return type;

  // 最終稿の場合
  if (num === 'final') return type + '(最終)';

  // 番号あり: タイプ名 + 番号
  return type + num;
}

/**
 * 工程タイプ追加処理
 */
async function handleAddMilestoneType() {
  const typeName = prompt('追加する工程タイプ名を入力してください:');
  if (!typeName || !typeName.trim()) return;

  const result = await addMilestoneType(typeName.trim());
  if (result.success) {
    // キャッシュを更新
    currentMilestoneTypes.push(result.data);
    // 既存の行のプルダウンを更新
    refreshMilestoneTypeDropdowns();
    alert('工程タイプ「' + typeName.trim() + '」を追加しました');
  } else {
    alert(result.message);
  }
}

/**
 * 全てのマイルストーン行のプルダウンを更新
 */
function refreshMilestoneTypeDropdowns() {
  const rows = document.querySelectorAll('#edit-milestones-list .milestone-edit-row');
  rows.forEach(row => {
    const select = row.querySelector('.milestone-type');
    const currentValue = select.value;

    // オプション再生成
    let options = '<option value="">工程を選択</option>';
    currentMilestoneTypes.forEach(t => {
      const selected = t.type_name === currentValue ? 'selected' : '';
      options += `<option value="${escapeHtml(t.type_name)}" ${selected}>${escapeHtml(t.type_name)}</option>`;
    });
    const otherSelected = currentValue === 'other' ? 'selected' : '';
    options += `<option value="other" ${otherSelected}>その他</option>`;

    select.innerHTML = options;
  });
}

/**
 * 見積行追加（編集画面用）
 */
function addEditEstimateRow(data = null) {
  const container = document.getElementById('edit-estimate-breakdown');
  const rowDiv = document.createElement('div');
  rowDiv.className = 'breakdown-row';

  let optionsHtml = '<option value="">選択してください</option>';
  cachedMasterData.editItems.forEach(item => {
    const selected = data && data.edit_item_id === item.edit_item_id ? 'selected' : '';
    optionsHtml += `<option value="${item.edit_item_id}" data-rate="${item.hourly_rate}" ${selected}>${escapeHtml(item.edit_item_name)}</option>`;
  });

  rowDiv.innerHTML = `
    <select class="estimate-item" onchange="calculateEditEstimateTotal()">
      ${optionsHtml}
    </select>
    <input type="number" class="estimate-amount" placeholder="金額" value="${data ? data.amount : ''}" onchange="calculateEditEstimateTotal()">
    <button type="button" class="remove-row-btn" onclick="this.parentElement.remove(); calculateEditEstimateTotal();">削除</button>
  `;

  container.appendChild(rowDiv);
}

/**
 * 見積合計計算（編集画面用）
 */
function calculateEditEstimateTotal() {
  const rows = document.querySelectorAll('#edit-estimate-breakdown .breakdown-row');
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

  document.getElementById('edit-estimate-total').textContent = formatNumber(total) + '円';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  document.getElementById('edit-target-hours').textContent = `${hours}時間${minutes}分`;

  // 差分計算
  calculateEditTimeDiff(totalMinutes);
}

/**
 * 目標と実働の差を計算
 */
function calculateEditTimeDiff(targetMinutes) {
  const actualMinutes = window.currentProjectActualMinutes || 0;
  const diff = actualMinutes - targetMinutes;

  const hours = Math.floor(Math.abs(diff) / 60);
  const minutes = Math.round(Math.abs(diff) % 60);
  const sign = diff >= 0 ? '+' : '-';

  const diffElement = document.getElementById('edit-time-diff');
  diffElement.textContent = `${sign}${hours}時間${minutes}分`;
  diffElement.className = 'value';
  if (diff >= 0) {
    diffElement.classList.add('over');
  }
}

/**
 * 完成URL行追加
 */
function addEditCompletedUrlRow(url = '') {
  const container = document.getElementById('edit-completed-urls-list');
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';

  row.innerHTML = `
    <input type="url" class="completed-url" placeholder="https://example.com" value="${escapeHtml(url)}" style="flex: 1;">
    <button type="button" class="remove-row-btn" onclick="this.parentElement.remove();">削除</button>
  `;

  container.appendChild(row);
}

/**
 * 編集時間履歴表示
 */
function displayEditTimeHistory(project) {
  const container = document.getElementById('edit-time-history');

  if (!project.edit_history || project.edit_history.length === 0) {
    container.innerHTML = '<p style="color: #999;">編集時間履歴がありません</p>';
    return;
  }

  let html = '<table style="width: 100%; border-collapse: collapse;">';
  html += '<thead><tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">';
  html += '<th style="padding: 10px; text-align: left;">日付</th>';
  html += '<th style="padding: 10px; text-align: left;">項目</th>';
  html += '<th style="padding: 10px; text-align: right;">時間</th>';
  html += '<th style="padding: 10px; text-align: left;">編集者</th>';
  html += '<th style="padding: 10px; text-align: left;">メモ</th>';
  html += '</tr></thead><tbody>';

  project.edit_history.forEach(h => {
    const totalMinutes = h.edit_time || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeDisplay = `${hours}:${String(minutes).padStart(2, '0')}`;

    html += '<tr style="border-bottom: 1px solid #eee;">';
    html += `<td style="padding: 8px;">${h.date || '-'}</td>`;
    html += `<td style="padding: 8px;">${escapeHtml(h.edit_item_name || '-')}</td>`;
    html += `<td style="padding: 8px; text-align: right;">${timeDisplay}</td>`;
    html += `<td style="padding: 8px;">${escapeHtml(h.editor_name || '-')}</td>`;
    html += `<td style="padding: 8px;">${escapeHtml(h.memo || '-')}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

/**
 * 編集時間追加行（編集画面用）
 */
function addEditTimeRowInEdit() {
  const container = document.getElementById('edit-time-add-section');
  const row = document.createElement('div');
  row.className = 'edit-time-add-row';
  row.style.cssText = 'display: grid; grid-template-columns: 150px 200px 60px 60px 1fr 80px; gap: 10px; margin-bottom: 10px; align-items: center;';

  let itemOptions = '<option value="">選択してください</option>';
  cachedMasterData.estimateItems.forEach(item => {
    itemOptions += `<option value="${item.estimate_item_id}">${escapeHtml(item.estimate_item_name)}</option>`;
  });

  row.innerHTML = `
    <input type="date" class="edit-time-date" value="${new Date().toISOString().split('T')[0]}">
    <select class="edit-time-item">${itemOptions}</select>
    <input type="number" class="edit-time-hours" placeholder="時" min="0" style="width: 100%;">
    <input type="number" class="edit-time-minutes" placeholder="分" min="0" max="59" style="width: 100%;">
    <input type="text" class="edit-time-memo" placeholder="メモ（任意）">
    <button type="button" class="remove-row-btn" onclick="this.parentElement.remove(); recalculateActualHoursInEdit();">削除</button>
  `;

  // 時間入力時に実働時間を再計算
  const hoursInput = row.querySelector('.edit-time-hours');
  const minutesInput = row.querySelector('.edit-time-minutes');
  hoursInput.addEventListener('input', recalculateActualHoursInEdit);
  minutesInput.addEventListener('input', recalculateActualHoursInEdit);

  container.appendChild(row);
}

/**
 * 実働時間再計算（追加分を含む）
 */
function recalculateActualHoursInEdit() {
  // 既存の履歴分
  const baseMinutes = window.currentProjectActualMinutes || 0;

  // 追加分
  let addedMinutes = 0;
  const rows = document.querySelectorAll('#edit-time-add-section .edit-time-add-row');
  rows.forEach(row => {
    const hours = parseInt(row.querySelector('.edit-time-hours').value) || 0;
    const minutes = parseInt(row.querySelector('.edit-time-minutes').value) || 0;
    addedMinutes += (hours * 60) + minutes;
  });

  const totalMinutes = baseMinutes + addedMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  document.getElementById('edit-actual-hours').textContent = `${hours}時間${minutes}分`;

  // 差分も再計算
  const targetText = document.getElementById('edit-target-hours').textContent;
  const targetMatch = targetText.match(/(\d+)時間(\d+)分/);
  if (targetMatch) {
    const targetMinutes = parseInt(targetMatch[1]) * 60 + parseInt(targetMatch[2]);
    calculateEditTimeDiff(targetMinutes);
  }
}

/**
 * 案件編集保存
 */
async function saveProjectEdit() {
  const projectId = document.getElementById('edit-project-id').value;
  const projectName = document.getElementById('edit-project-name').value;
  const deliveryDate = document.getElementById('edit-delivery-date').value;
  const actualDeliveryDate = document.getElementById('edit-actual-delivery-date').value;
  const mainEditor = document.getElementById('edit-main-editor').value;
  // ディレクターは社内ユーザーのほかに「外部」を選べる
  const directorValue = document.getElementById('edit-director').value;
  const isExternalDirector = directorValue === EXTERNAL_DIRECTOR_VALUE;
  const director = isExternalDirector ? '' : directorValue;
  const externalDirectorName = isExternalDirector
    ? document.getElementById('edit-external-director-name').value.trim()
    : '';
  const fileStorageUrl = document.getElementById('edit-file-storage-url').value;
  const estimateNumber = document.getElementById('edit-estimate-number').value;
  const reflection = document.getElementById('edit-reflection').value;
  const mainEditorMessage = document.getElementById('edit-main-editor-message').value;
  const otherNotes = document.getElementById('edit-other-notes').value;
  const assignedLeader = document.getElementById('edit-assigned-leader').value;

  // 通常保存時は基本項目のみチェック（案件名、納期、メイン編集者）
  if (!projectName || !deliveryDate || !mainEditor) {
    alert('案件名、納期、メイン編集者は必須項目です。');
    return;
  }

  // サブ編集者
  const subEditors = Array.from(document.querySelectorAll('#edit-sub-editors input[type="checkbox"]:checked'))
    .map(cb => cb.value);

  // ジャンル
  const genres = Array.from(document.querySelectorAll('#edit-genres input[type="checkbox"]:checked'))
    .map(cb => cb.value);

  // 使用技術
  const technologies = Array.from(document.querySelectorAll('#edit-technologies input[type="checkbox"]:checked'))
    .map(cb => cb.value);

  // 完成URL
  const completedUrls = Array.from(document.querySelectorAll('#edit-completed-urls-list .completed-url'))
    .map(input => input.value)
    .filter(url => url);

  // 見積内訳
  const estimateBreakdown = [];
  const breakdownRows = document.querySelectorAll('#edit-estimate-breakdown .breakdown-row');
  breakdownRows.forEach(row => {
    const itemId = row.querySelector('.estimate-item').value;
    const amount = parseInt(row.querySelector('.estimate-amount').value) || 0;
    if (itemId && amount > 0) {
      estimateBreakdown.push({ estimate_item_id: itemId, amount });
    }
  });

  // 編集費合計（内訳からの自動計算）
  const estimateTotalText = document.getElementById('edit-estimate-total').textContent;
  const estimateTotal = parseInt(estimateTotalText.replace(/[^0-9]/g, '')) || 0;

  // 見積合計金額（編集費以外を含む手入力値）
  const estimateGrandTotal = parseAmountInput(
    document.getElementById('edit-estimate-grand-total').value
  );

  // 追加編集時間
  const newEditTimes = [];
  const editTimeRows = document.querySelectorAll('#edit-time-add-section .edit-time-add-row');
  editTimeRows.forEach(row => {
    const date = row.querySelector('.edit-time-date').value;
    const itemId = row.querySelector('.edit-time-item').value;
    const hours = parseInt(row.querySelector('.edit-time-hours').value) || 0;
    const minutes = parseInt(row.querySelector('.edit-time-minutes').value) || 0;
    const totalMinutes = (hours * 60) + minutes;
    const memo = row.querySelector('.edit-time-memo').value;
    if (date && itemId && totalMinutes > 0) {
      newEditTimes.push({ date, estimate_item_id: itemId, edit_time: totalMinutes, memo });
    }
  });

  // PDFファイル
  const pdfFile = document.getElementById('edit-pdf-file').files[0];

  const projectData = {
    id: currentEditingProject?.id, // UUIDを使用
    project_id: projectId,
    project_name: projectName,
    delivery_date: deliveryDate,
    actual_delivery_date: actualDeliveryDate || null,
    main_editor: mainEditor,
    sub_editors: subEditors,
    director: director,
    is_external_director: isExternalDirector,
    external_director_name: externalDirectorName,
    genres: genres,
    technologies: technologies,
    estimate_pdf_url: currentEditingProject?.estimate_pdf_url, // 既存のPDF URLを保持
    file_storage_url: fileStorageUrl,
    completed_urls: completedUrls,
    estimate_number: estimateNumber,
    estimate_breakdown: estimateBreakdown,
    estimate_total: estimateTotal,
    estimate_grand_total: estimateGrandTotal,
    reflection: reflection,
    main_editor_message: mainEditorMessage,
    other_notes: otherNotes,
    assigned_leader: assignedLeader,
    new_edit_times: newEditTimes
  };

  // 新しいPDFが選択されている場合は追加
  if (pdfFile) {
    projectData.pdf_file = pdfFile;
  }

  // マイルストーン
  const milestoneRows = document.querySelectorAll('#edit-milestones-list .milestone-edit-row');
  const milestones = [];
  let skippedMilestoneRows = 0;
  milestoneRows.forEach(row => {
    const name = getMilestoneNameFromRow(row);
    const plannedDate = row.querySelector('.milestone-planned-date').value;
    const completedDate = row.querySelector('.milestone-completed-date').value;
    const confirmedBy = row.querySelector('.milestone-reviewer').value || null;
    const memo = row.querySelector('.milestone-memo').value.trim() || null;
    if (name) {
      milestones.push({ id: row.dataset.milestoneId || null, milestone_name: name, planned_date: plannedDate, completed_date: completedDate, confirmed_by: confirmedBy, memo: memo });
    } else if (plannedDate || completedDate || confirmedBy || memo) {
      // 工程タイプが未選択だと工程名が作れず、この行は保存されない。
      // 何も入力していない空行（既定で1本出る）は数えない。
      skippedMilestoneRows++;
    }
  });

  if (skippedMilestoneRows > 0) {
    const proceed = confirm(
      `進捗マイルストーンに、工程タイプが未選択の行が${skippedMilestoneRows}件あります。\n` +
      'この行は保存されず、入力した日付やメモは失われます。\n\n' +
      'このまま保存しますか？'
    );
    if (!proceed) {
      return { success: false, message: '工程タイプが未選択のため保存を中止しました' };
    }
  }

  showLoading('project-edit-screen');

  const [result, milestoneResult] = await Promise.all([
    updateProject(projectData),
    saveProjectMilestones(projectId, milestones)
  ]);

  if (result.success) {
    if (milestoneResult && milestoneResult.success) {
      alert('案件を保存しました。');
    } else {
      // 黙って成功扱いにすると、工程だけ保存されていない状態に気づけない。
      // 差分更新なので既存の工程は残っているが、途中まで反映されている
      // 可能性はあるため、画面を開き直して確認してもらう。
      console.error('マイルストーンの保存に失敗しました:', milestoneResult);
      alert(
        '案件は保存しましたが、進捗マイルストーンの保存に失敗しました。\n' +
        '今回の変更が一部しか反映されていない可能性があります。\n' +
        'お手数ですが案件編集画面で工程の内容をご確認ください。\n\n' +
        '詳細: ' + (milestoneResult?.message || '不明なエラー')
      );
    }
    showProjectDetail(projectId);
  } else {
    showError('project-edit-screen', result.message);
  }

  return result;
}

/**
 * 上長に申請
 */
async function submitProjectToLeader() {
  // 編集中のプロジェクトが存在するか確認
  if (!currentEditingProject) {
    alert('プロジェクトデータが読み込まれていません。');
    return;
  }

  // 申請上長が選択されているか確認
  const assignedLeaderElement = document.getElementById('edit-assigned-leader');
  if (!assignedLeaderElement || !assignedLeaderElement.value) {
    alert('申請上長を選択してください。');
    return;
  }

  const assignedLeader = assignedLeaderElement.value;
  const projectId = document.getElementById('edit-project-id').value;

  // 申請時の必須項目チェック
  const reflection = document.getElementById('edit-reflection').value;
  const mainEditorMessage = document.getElementById('edit-main-editor-message').value;
  const projectName = document.getElementById('edit-project-name').value;
  const deliveryDate = document.getElementById('edit-delivery-date').value;
  const mainEditor = document.getElementById('edit-main-editor').value;

  if (!projectName || !deliveryDate || !mainEditor || !reflection || !mainEditorMessage || !assignedLeader) {
    alert('申請には以下の項目が必須です：\n・案件名\n・納期\n・メイン編集者\n・振り返り\n・メイン編集者コメント\n・申請上長');
    return;
  }

  // まず保存
  const saveResult = await saveProjectEdit();

  if (!saveResult || !saveResult.success) {
    alert('保存に失敗しました: ' + (saveResult?.message || '不明なエラー'));
    return;
  }

  // 保存成功後、申請処理
  const result = await submitProject(projectId, assignedLeader);

  if (result.success) {
    alert('上長に申請しました。');
    showDashboard();
  } else {
    alert('申請に失敗しました: ' + result.message);
  }
}

/**
 * PDFを表示
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
