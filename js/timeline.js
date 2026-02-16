// ========================================
// タイムライン画面（ガントチャート風）
// ========================================

// タイムラインの状態管理
let timelineState = {
  viewMode: 'week',    // 'day', 'week', 'month'
  filter: 'mine',      // 'mine', 'director', 'others', 'all'
  projects: [],        // 読み込んだ全プロジェクト（マイルストーン付き）
  dateRange: { start: null, end: null }
};

/**
 * タイムライン画面表示
 */
async function showTimeline() {
  hideAllScreens();
  const screen = document.getElementById('timeline-screen');
  screen.classList.remove('hidden');
  saveCurrentScreen('timeline');

  const user = getCurrentUser();
  if (!user) {
    screen.innerHTML = '<div class="card"><div class="message error">ユーザー情報が取得できません</div></div>';
    return;
  }

  await loadMasterData();

  // シェルHTML表示
  screen.innerHTML = buildTimelineShell();

  // データ読み込み＆描画
  await loadTimelineData();
}

/**
 * シェルHTML（コントロールバー＋コンテナ）
 */
function buildTimelineShell() {
  return `
    <div class="card">
      <div class="detail-header">
        <h2>案件タイムライン</h2>
        <div>
          ${createBackButton('showDashboard()')}
        </div>
      </div>

      <div class="timeline-controls">
        <div class="timeline-filter-group">
          <button class="btn timeline-filter-btn" data-filter="all" onclick="setTimelineFilter('all')">全案件</button>
          <button class="btn timeline-filter-btn active" data-filter="mine" onclick="setTimelineFilter('mine')">自分の案件</button>
          <button class="btn timeline-filter-btn" data-filter="director" onclick="setTimelineFilter('director')">ディレクター案件</button>
          <button class="btn timeline-filter-btn" data-filter="others" onclick="setTimelineFilter('others')">他の人の案件</button>
        </div>

        <div class="timeline-view-group">
          <button class="btn timeline-view-btn" data-view="day" onclick="setTimelineView('day')">日</button>
          <button class="btn timeline-view-btn active" data-view="week" onclick="setTimelineView('week')">週</button>
          <button class="btn timeline-view-btn" data-view="month" onclick="setTimelineView('month')">月</button>
        </div>

        <div class="timeline-nav-group">
          <button class="btn btn-secondary" onclick="navigateTimeline(-1)">&#9664;</button>
          <button class="btn btn-secondary" onclick="navigateTimelineToday()">今日</button>
          <button class="btn btn-secondary" onclick="navigateTimeline(1)">&#9654;</button>
        </div>
      </div>

      <div id="timeline-container" class="timeline-container">
        <div style="text-align: center; padding: 50px; color: #999;">読み込み中...</div>
      </div>

      <div class="timeline-legend">
        <span class="timeline-legend-item">
          <span class="timeline-legend-dot" style="background: #4CAF50;"></span>完了
        </span>
        <span class="timeline-legend-item">
          <span class="timeline-legend-dot" style="background: #f44336;"></span>遅延
        </span>
        <span class="timeline-legend-item">
          <span class="timeline-legend-dot" style="background: #bbb;"></span>予定
        </span>
        <span class="timeline-legend-item">
          <span class="tl-delivery-marker" style="font-size:14px;">&#9733;</span>納品予定日
        </span>
      </div>
    </div>
  `;
}

/**
 * データ読み込み
 */
async function loadTimelineData() {
  const result = await searchProjects({});

  if (!result.success) {
    document.getElementById('timeline-container').innerHTML =
      `<div class="message error">${escapeHtml(result.message)}</div>`;
    return;
  }

  // 進行中ステータスのみ
  const activeStatuses = ['draft', 'submitted', 'leader_approved', 'rejected'];
  let allProjects = (result.data || []).filter(p => activeStatuses.includes(p.status));

  // マイルストーン一括取得
  const projectUuids = allProjects.map(p => p.id);
  const milestonesResult = await getMultipleProjectMilestones(projectUuids);
  const milestonesMap = milestonesResult.success ? milestonesResult.data : {};

  // マイルストーンを各プロジェクトに紐付け
  allProjects.forEach(p => {
    p.milestones = milestonesMap[p.id] || [];
  });

  timelineState.projects = allProjects;

  calculateDateRange();
  renderTimeline();
}

/**
 * フィルタ適用
 */
function getFilteredProjects() {
  const user = getCurrentUser();
  const filter = timelineState.filter;

  return timelineState.projects.filter(p => {
    switch (filter) {
      case 'mine':
        return p.main_editor === user.id;
      case 'director':
        return p.director === user.id;
      case 'others':
        return p.main_editor !== user.id && p.director !== user.id;
      case 'all':
      default:
        return true;
    }
  });
}

/**
 * 日付範囲を自動算出
 */
function calculateDateRange() {
  const projects = getFilteredProjects();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // データの最小・最大日付を算出
  let minDate = new Date(today);
  let maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  const allDates = [];
  projects.forEach(p => {
    if (p.delivery_date) allDates.push(new Date(p.delivery_date));
    (p.milestones || []).forEach(m => {
      if (m.planned_date) allDates.push(new Date(m.planned_date));
      if (m.completed_date) allDates.push(new Date(m.completed_date));
    });
  });

  if (allDates.length > 0) {
    const dataMin = new Date(Math.min(...allDates));
    const dataMax = new Date(Math.max(...allDates));
    // 過去のデータも含める（2週間前のパディング）
    dataMin.setDate(dataMin.getDate() - 14);
    if (dataMin < minDate) {
      minDate = dataMin;
    }
    dataMax.setDate(dataMax.getDate() + 14);
    if (dataMax > maxDate) {
      maxDate = dataMax;
    }
  }

  // 月表示の場合は月初・月末にアライン
  if (timelineState.viewMode === 'month') {
    minDate.setDate(1);
    maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  }

  timelineState.dateRange = { start: minDate, end: maxDate };
}

/**
 * タイムラインを描画
 */
function renderTimeline() {
  const container = document.getElementById('timeline-container');
  const projects = getFilteredProjects();

  if (projects.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">表示する案件がありません</p>';
    return;
  }

  const { start, end } = timelineState.dateRange;
  const columns = generateDateColumns(start, end);
  const today = formatDateISO(new Date());
  const colWidth = getColumnWidth();

  // ヘッダー行
  let headerHtml = '<div class="tl-header-label">案件名</div>';

  // 月ヘッダー（日表示・週表示の場合）
  let monthHeaderHtml = '';
  if (timelineState.viewMode === 'day' || timelineState.viewMode === 'week') {
    monthHeaderHtml = '<div class="tl-month-label"></div>';
    let currentMonth = '';
    let monthSpan = 0;
    const monthGroups = [];

    columns.forEach(col => {
      const colDate = new Date(col.startStr);
      const monthKey = `${colDate.getFullYear()}/${colDate.getMonth() + 1}`;
      if (monthKey !== currentMonth) {
        if (currentMonth) {
          monthGroups.push({ label: currentMonth + '月', span: monthSpan });
        }
        currentMonth = monthKey;
        monthSpan = 1;
      } else {
        monthSpan++;
      }
    });
    if (currentMonth) {
      monthGroups.push({ label: currentMonth + '月', span: monthSpan });
    }

    monthHeaderHtml = '<div class="tl-month-label"></div>';
    monthGroups.forEach(g => {
      monthHeaderHtml += `<div class="tl-month-cell" style="grid-column: span ${g.span};">${g.label}</div>`;
    });
  }

  columns.forEach(col => {
    const isToday = col.startStr <= today && col.endStr >= today;
    const weekendClass = col.isWeekend ? ' tl-weekend' : '';
    headerHtml += `<div class="tl-header-cell${isToday ? ' tl-today' : ''}${weekendClass}" title="${escapeHtml(col.fullLabel)}">${col.label}</div>`;
  });

  // プロジェクト行
  let rowsHtml = '';
  projects.forEach(p => {
    const editorName = getTimelineUserName(p.main_editor);
    rowsHtml += `<div class="tl-row-label" onclick="showProjectDetail('${escapeHtml(p.project_id)}')" title="${escapeHtml(p.project_name)}&#10;編集者: ${escapeHtml(editorName)}">
        <div class="tl-project-name">${escapeHtml(p.project_name)}</div>
        <div class="tl-project-editor">${escapeHtml(editorName)}</div>
      </div>`;

    columns.forEach(col => {
      const isToday = col.startStr <= today && col.endStr >= today;
      const weekendClass = col.isWeekend ? ' tl-weekend' : '';
      const cellContent = renderCellContent(p, col);
      rowsHtml += `<div class="tl-cell${isToday ? ' tl-today' : ''}${weekendClass}">${cellContent}</div>`;
    });
  });

  // 月ヘッダーを含むか判定
  const hasMonthHeader = timelineState.viewMode === 'day' || timelineState.viewMode === 'week';
  const gridStyle = `grid-template-columns: 200px repeat(${columns.length}, ${colWidth}px);`;

  container.innerHTML = `
    <div class="tl-grid" style="${gridStyle}">
      ${hasMonthHeader ? monthHeaderHtml : ''}
      ${headerHtml}
      ${rowsHtml}
    </div>
  `;

  // 今日の列が左端に来るようスクロール
  scrollToToday(columns, colWidth);
}

/**
 * 日付カラムの生成
 */
function generateDateColumns(start, end) {
  const columns = [];
  const current = new Date(start);

  while (current <= end) {
    switch (timelineState.viewMode) {
      case 'day': {
        const dateStr = formatDateISO(current);
        const dayOfWeek = ['日','月','火','水','木','金','土'][current.getDay()];
        columns.push({
          startStr: dateStr,
          endStr: dateStr,
          label: `${current.getDate()}`,
          fullLabel: `${current.getFullYear()}/${current.getMonth()+1}/${current.getDate()} (${dayOfWeek})`,
          isWeekend: current.getDay() === 0 || current.getDay() === 6
        });
        current.setDate(current.getDate() + 1);
        break;
      }
      case 'week': {
        // 週の開始（月曜日）にアライン
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);

        columns.push({
          startStr: formatDateISO(weekStart),
          endStr: formatDateISO(weekEnd),
          label: `${weekStart.getMonth()+1}/${weekStart.getDate()}`,
          fullLabel: `${formatDateISO(weekStart)} ~ ${formatDateISO(weekEnd)}`,
          isWeekend: false
        });
        current.setDate(current.getDate() + 7);
        break;
      }
      case 'month': {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

        columns.push({
          startStr: formatDateISO(monthStart),
          endStr: formatDateISO(monthEnd),
          label: `${current.getFullYear()}/${current.getMonth()+1}`,
          fullLabel: `${current.getFullYear()}年${current.getMonth()+1}月`,
          isWeekend: false
        });
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
        break;
      }
    }
  }
  return columns;
}

/**
 * セル内のマイルストーンマーカー描画
 */
function renderCellContent(project, column) {
  const milestones = (project.milestones || []).filter(m => {
    const date = m.planned_date || m.completed_date;
    if (!date) return false;
    return date >= column.startStr && date <= column.endStr;
  });

  // 納品予定日のチェック
  let deliveryMarker = '';
  if (project.delivery_date &&
      project.delivery_date >= column.startStr &&
      project.delivery_date <= column.endStr) {
    deliveryMarker = '<div class="tl-delivery" title="納品予定日"><span class="tl-delivery-marker">&#9733;</span><span class="tl-milestone-text">納品予定日</span></div>';
  }

  if (milestones.length === 0) {
    return deliveryMarker;
  }

  const today = formatDateISO(new Date());

  const markersHtml = milestones.map(m => {
    let colorClass = 'tl-milestone-upcoming';
    if (m.completed_date) {
      colorClass = 'tl-milestone-completed';
    } else if (m.planned_date && m.planned_date < today) {
      colorClass = 'tl-milestone-overdue';
    }

    const parsed = timelineSplitMilestoneName(m.milestone_name);
    // 回数+項目を両方表示
    let displayName;
    if (parsed.item === '稿') {
      displayName = parsed.count; // 初稿、2稿、最終稿
    } else if (parsed.count === '-') {
      displayName = parsed.item;
    } else {
      displayName = `${parsed.count} ${parsed.item}`; // 初稿 社内確認
    }

    // 社内確認は〇マーカー、それ以外はダイヤモンド
    const isCircle = m.milestone_name.includes('社内確認');
    const markerHtml = isCircle
      ? '<div class="tl-milestone-circle"></div>'
      : '<div class="tl-milestone-diamond"></div>';

    const tooltip = `${m.milestone_name}\n予定: ${m.planned_date || '-'}\n完了: ${m.completed_date || '-'}`;

    return `<div class="tl-milestone ${colorClass}" title="${escapeHtml(tooltip)}">
        ${markerHtml}
        <span class="tl-milestone-text">${escapeHtml(displayName)}</span>
      </div>`;
  }).join('');

  return markersHtml + deliveryMarker;
}

/**
 * マイルストーン名を分解（project.jsのsplitMilestoneNameと同じロジック）
 */
function timelineSplitMilestoneName(name) {
  if (!name) return { count: '-', item: '-' };
  if (name.endsWith('稿')) {
    const prefix = name.slice(0, -1);
    if (prefix === '初') return { count: '初稿', item: '稿' };
    if (prefix === '最終') return { count: '最終稿', item: '稿' };
    if (/^\d+$/.test(prefix)) return { count: name, item: '稿' };
  }
  if (name.endsWith('(最終)')) {
    return { count: '最終稿', item: name.slice(0, -4) };
  }
  const match = name.match(/^(.+?)(\d+)$/);
  if (match) {
    const num = match[2];
    const countLabel = num === '1' ? '初稿' : num + '稿';
    return { count: countLabel, item: match[1] };
  }
  return { count: '-', item: name };
}

// ========================================
// ヘルパー関数
// ========================================

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTimelineUserName(userId) {
  if (!userId || !cachedMasterData.users) return '-';
  const user = cachedMasterData.users.find(u => u.id === userId);
  return user ? user.name : '-';
}

function scrollToToday(columns, colWidth) {
  const container = document.getElementById('timeline-container');
  if (!container) return;
  const today = formatDateISO(new Date());
  const todayIndex = columns.findIndex(col => col.startStr <= today && col.endStr >= today);
  if (todayIndex >= 0) {
    // 案件名ラベル幅(200px)を除いた位置にスクロール
    container.scrollLeft = todayIndex * colWidth;
  }
}

function getColumnWidth() {
  switch (timelineState.viewMode) {
    case 'day': return 40;
    case 'week': return 80;
    case 'month': return 120;
    default: return 80;
  }
}

// ========================================
// インタラクション
// ========================================

function setTimelineFilter(filter) {
  timelineState.filter = filter;
  document.querySelectorAll('.timeline-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  calculateDateRange();
  renderTimeline();
}

function setTimelineView(view) {
  timelineState.viewMode = view;
  document.querySelectorAll('.timeline-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  calculateDateRange();
  renderTimeline();
}

function navigateTimeline(direction) {
  const { start, end } = timelineState.dateRange;
  const range = end.getTime() - start.getTime();
  const shift = range * 0.3 * direction;

  timelineState.dateRange.start = new Date(start.getTime() + shift);
  timelineState.dateRange.end = new Date(end.getTime() + shift);

  renderTimeline();
}

function navigateTimelineToday() {
  calculateDateRange();
  renderTimeline();
}
