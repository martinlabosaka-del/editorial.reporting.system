// ========================================
// 承認画面
// ========================================

/**
 * 承認検索画面表示
 */
async function showApprovalSearch() {
  hideAllScreens();
  const screen = document.getElementById('approval-search-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('approval-search');

  await loadMasterData();

  const html = `
    <div class="card">
      <h2>承認</h2>
      ${createBackButton('showDashboard()')}

      <form id="approval-search-form">
        <div class="form-group">
          <label>クライアント</label>
          <select id="approval-search-client">
            ${createSelectOptions(cachedMasterData.clients, 'client_id', 'client_name')}
          </select>
        </div>

        <div class="form-group">
          <label>案件名</label>
          <input type="text" id="approval-search-project-name" placeholder="部分一致">
        </div>

        <div class="form-group">
          <label>メイン編集者</label>
          <select id="approval-search-main-editor">
            ${createSelectOptions(cachedMasterData.users, 'user_id', 'name')}
          </select>
        </div>

        <div class="form-group">
          <label>承認ステータス</label>
          <select id="approval-search-status">
            <option value="">すべて</option>
            <option value="submitted" selected>提出済み</option>
            <option value="rejected">差戻し</option>
            <option value="leader_approved">リーダー承認</option>
            <option value="executive_approved">役員承認</option>
          </select>
        </div>

        <div class="btn-group">
          <button type="submit" class="btn btn-primary">検索</button>
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('approval-search-form').reset()">クリア</button>
        </div>
      </form>

      <div id="approval-search-results"></div>
    </div>
  `;

  screen.innerHTML = html;

  document.getElementById('approval-search-form').onsubmit = async function(e) {
    e.preventDefault();
    await handleApprovalSearch();
    return false;
  };

  // 初回検索（提出済みのみ）
  await handleApprovalSearch();
}

/**
 * 承認案件検索実行
 */
async function handleApprovalSearch() {
  const criteria = {
    client_id: document.getElementById('approval-search-client').value,
    project_name: document.getElementById('approval-search-project-name').value,
    main_editor: document.getElementById('approval-search-main-editor').value,
    status: document.getElementById('approval-search-status').value
  };

  const resultsDiv = document.getElementById('approval-search-results');
  resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px;">検索中...</div>';

  // 例外を捕まえないと「検索中...」の表示が残り続けて操作不能に見えるため、
  // 必ずここで結果かエラーのどちらかを描画する
  try {
    const result = await searchApprovalProjects(criteria);

    if (result && result.success) {
      renderApprovalResults(result.data || []);
    } else {
      const message = (result && result.message) || '検索に失敗しました';
      resultsDiv.innerHTML = `<div class="message error">${escapeHtml(message)}</div>`;
    }
  } catch (error) {
    console.error('handleApprovalSearch error:', error);
    resultsDiv.innerHTML =
      `<div class="message error">検索に失敗しました: ${escapeHtml(error.message || String(error))}</div>`;
  }
}

/**
 * 承認検索結果表示
 */
function renderApprovalResults(projects) {
  const resultsDiv = document.getElementById('approval-search-results');

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
          <th>メイン編集者</th>
          <th>提出日</th>
          <th>承認ステータス</th>
        </tr>
      </thead>
      <tbody>
  `;

  projects.forEach(project => {
    html += `
      <tr onclick="showApprovalDetail('${project.project_id}')">
        <td>${escapeHtml(project.project_name)}</td>
        <td>${escapeHtml(project.client_name || '')}</td>
        <td>${escapeHtml(project.main_editor_name || '')}</td>
        <td>${formatDate(project.submitted_at)}</td>
        <td>${createApprovalBadge(project.status)}</td>
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
 * 承認詳細画面表示
 */
async function showApprovalDetail(projectId) {
  hideAllScreens();
  const screen = document.getElementById('approval-detail-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('approval-detail', { projectId });

  showLoading('approval-detail-screen');

  const result = await getProjectForApproval(projectId);

  if (!result.success) {
    showError('approval-detail-screen', result.message);
    return;
  }

  const project = result.data;
  const user = getCurrentUser();

  // 承認・差戻しボタンの表示制御
  const canApprove = project.status === 'submitted' &&
                     (user.role === 'leader' || user.role === 'executive');

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
        <h2>承認詳細</h2>
        <div class="detail-meta">
          <div><strong>案件番号:</strong> ${escapeHtml(project.project_id)}</div>
          <div><strong>登録日:</strong> ${project.registration_date || '-'}</div>
        </div>
      </div>

      ${createBackButton('showApprovalSearch()')}

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
        <label>見積合計金額</label>
        <p>${project.estimate_grand_total != null
              ? '¥' + formatNumber(Math.round(project.estimate_grand_total))
              : '<span style="color: #999;">未入力</span>'}</p>
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
      <h3 style="margin: 20px 0 15px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">上長からのフィードバック</h3>

      ${canApprove ? `
        <div class="form-group">
          <label>上長からのフィードバック</label>
          <textarea id="leader-feedback" rows="5" placeholder="編集者へのフィードバックを入力してください"></textarea>
        </div>
      ` : `
        <div class="form-group">
          <p style="white-space: pre-wrap;">${escapeHtml(project.leader_message || '-')}</p>
        </div>
      `}

      <!-- 上長評価（承認者のみ表示） -->
      ${canApprove ? `
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffc107;">
          <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #ffc107; padding-bottom: 5px;">上長評価</h3>

          <div class="form-group">
            <label>①本案件を終えて感じた編集者に必要な要素・技術面</label>
            <textarea id="editor-technical-comment" rows="4" placeholder="例：aftereffectのアニメーション"></textarea>
          </div>

          <div class="form-group">
            <label>対応面</label>
            <textarea id="editor-response-comment" rows="4" placeholder="例：気軽に質問して欲しい"></textarea>
          </div>

          <div class="form-group">
            <label>②編集者に必要な教育内容 技術面</label>
            <textarea id="education-technical-comment" rows="4" placeholder="例：簡単な編集案件で aftereffect のコンポジット構成について教える"></textarea>
          </div>

          <div class="form-group">
            <label>対応面</label>
            <textarea id="education-response-comment" rows="4" placeholder="例：教育者から何か質問はないか毎日ヒアリング"></textarea>
          </div>

          <div class="form-group">
            <label>③その他気づいた点など（任意）</label>
            <textarea id="other-comments" rows="4" placeholder="自由記述"></textarea>
          </div>

          <div class="form-group">
            <label>差戻理由（差戻しの場合のみ入力）</label>
            <textarea id="rejection-reason" rows="3" placeholder="差戻しの場合は理由を入力してください"></textarea>
          </div>

          <div class="btn-group">
            <button type="button" class="btn btn-primary" onclick="handleApprove('${projectId}')">承認</button>
            <button type="button" class="btn" style="background: #f44336; color: white;" onclick="handleReject('${projectId}')">差戻し</button>
            <button type="button" class="btn btn-secondary" onclick="showApprovalSearch()">戻る</button>
          </div>
        </div>
      ` : `
        ${project.leader_comment ? `
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">上長からの評価</h3>
            <div style="padding: 8px; background: white; border: 1px solid #ddd; border-radius: 4px; min-height: 60px; white-space: pre-wrap;">${escapeHtml(project.leader_comment)}</div>
          </div>
        ` : ''}
        <div class="btn-group" style="margin-top: 30px;">
          <button class="btn btn-secondary" onclick="showApprovalSearch()">戻る</button>
        </div>
      `}

      <div id="approval-message"></div>
    </div>
  `;

  screen.innerHTML = html;
}

/**
 * 編集履歴テーブル表示
 */
function renderEditHistoryTable(editHistory) {
  if (!editHistory || editHistory.length === 0) {
    return '<p>編集履歴がありません</p>';
  }

  let html = `
    <table class="results-table">
      <thead>
        <tr>
          <th>日付</th>
          <th>編集者</th>
          <th>作業項目</th>
          <th>時間</th>
          <th>メモ</th>
        </tr>
      </thead>
      <tbody>
  `;

  editHistory.forEach(item => {
    html += `
      <tr>
        <td>${formatDate(item.edit_date)}</td>
        <td>${escapeHtml(item.editor_name || '')}</td>
        <td>${escapeHtml(item.edit_item_name || '')}</td>
        <td>${decimalToTime(item.edit_hours || 0)}</td>
        <td>${escapeHtml(item.edit_memo || '-')}</td>
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
 * 承認処理
 */
async function handleApprove(projectId) {
  const confirmed = confirm('この案件を承認しますか?');
  if (!confirmed) return;

  // 上長からのフィードバックを取得
  const leaderFeedback = document.getElementById('leader-feedback')?.value || '';

  // 全ての評価コメントを取得
  const editorTechnical = document.getElementById('editor-technical-comment')?.value || '';
  const editorResponse = document.getElementById('editor-response-comment')?.value || '';
  const educationTechnical = document.getElementById('education-technical-comment')?.value || '';
  const educationResponse = document.getElementById('education-response-comment')?.value || '';
  const otherComments = document.getElementById('other-comments')?.value || '';

  // コメントを1つにまとめる
  const leaderComment = `①本案件を終えて感じた編集者に必要な要素
技術面: ${editorTechnical}
対応面: ${editorResponse}

②編集者に必要な教育内容
技術面: ${educationTechnical}
対応面: ${educationResponse}

③その他気づいた点など
${otherComments}`;

  const evaluationData = {
    project_id: projectId,
    status: 'leader_approved',
    leader_comment: leaderComment,
    leader_message: leaderFeedback
  };

  showMessage('approval-message', '承認処理中...', 'success');

  const result = await saveLeaderEvaluation(evaluationData);

  if (result.success) {
    showMessage('approval-message', result.message, 'success');

    setTimeout(() => {
      showApprovalSearch();
    }, 2000);
  } else {
    showMessage('approval-message', result.message, 'error');
  }
}

/**
 * 差戻し処理
 */
async function handleReject(projectId) {
  const rejectionReason = document.getElementById('rejection-reason')?.value || '';

  if (!rejectionReason) {
    showMessage('approval-message', '差戻し理由を入力してください', 'error');
    return;
  }

  const confirmed = confirm('この案件を差戻しますか?');
  if (!confirmed) return;

  // 上長からのフィードバックを取得
  const leaderFeedback = document.getElementById('leader-feedback')?.value || '';

  // 評価コメントも取得（任意）
  const editorTechnical = document.getElementById('editor-technical-comment')?.value || '';
  const editorResponse = document.getElementById('editor-response-comment')?.value || '';
  const educationTechnical = document.getElementById('education-technical-comment')?.value || '';
  const educationResponse = document.getElementById('education-response-comment')?.value || '';
  const otherComments = document.getElementById('other-comments')?.value || '';

  // コメントを1つにまとめる
  const leaderComment = `①本案件を終えて感じた編集者に必要な要素
技術面: ${editorTechnical}
対応面: ${editorResponse}

②編集者に必要な教育内容
技術面: ${educationTechnical}
対応面: ${educationResponse}

③その他気づいた点など
${otherComments}`;

  const evaluationData = {
    project_id: projectId,
    status: 'rejected',
    leader_comment: leaderComment,
    leader_message: leaderFeedback,
    rejection_reason: rejectionReason
  };

  showMessage('approval-message', '差戻し処理中...', 'success');

  const result = await saveLeaderEvaluation(evaluationData);

  if (result.success) {
    showMessage('approval-message', result.message, 'success');

    setTimeout(() => {
      showApprovalSearch();
    }, 2000);
  } else {
    showMessage('approval-message', result.message, 'error');
  }
}
