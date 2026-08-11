// ========================================
// ユーティリティ関数
// ========================================

/**
 * 日付フォーマット (YYYY-MM-DD)
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日時フォーマット (YYYY-MM-DD HH:MM)
 */
function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * 時間を小数に変換 (例: "1:30" → 1.5)
 */
function timeToDecimal(timeString) {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  return hours + (minutes / 60);
}

/**
 * 小数を時間に変換 (例: 1.5 → "1:30")
 */
function decimalToTime(decimal) {
  if (!decimal) return '0:00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 分単位を時間形式に変換 (例: 435 → "7:15")
 */
function minutesToTime(totalMinutes) {
  if (!totalMinutes || totalMinutes === 0) return '0:00';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 数値をカンマ区切りにフォーマット
 */
function formatNumber(num) {
  if (!num) return '0';
  return num.toLocaleString();
}

/**
 * 金額入力欄の値を数値に変換
 * 未入力は null（DBのNULL＝未入力）として扱い、0と区別する
 */
function parseAmountInput(value) {
  if (value === null || value === undefined) return null;

  const trimmed = String(value).trim();
  if (trimmed === '') return null;

  // カンマ付きで入力された場合にも対応
  const parsed = Number(trimmed.replace(/,/g, ''));
  if (!isFinite(parsed) || parsed < 0) return null;

  return Math.round(parsed);
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 承認ステータスバッジHTML生成
 * 案件のステータスは draft / submitted / leader_approved / executive_approved / rejected の5種類。
 */
function createApprovalBadge(status) {
  const labels = {
    'draft': '下書き',
    'submitted': '提出済み',
    'rejected': '差戻し',
    'leader_approved': 'リーダー承認',
    'executive_approved': '役員承認'
  };
  return `<span class="approval-badge approval-${status}">${labels[status] || status}</span>`;
}

/**
 * YouTubeサムネイル取得
 */
function getYouTubeThumbnail(url) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * YouTube動画ID抽出
 */
function extractYouTubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Vimeo動画ID抽出
 */
function extractVimeoVideoId(url) {
  if (!url) return null;
  const regExp = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

/**
 * 動画埋め込みHTML生成
 */
function createVideoEmbed(url) {
  if (!url) return '';

  // YouTube
  const youtubeId = extractYouTubeVideoId(url);
  if (youtubeId) {
    return `
      <div style="margin-bottom: 10px;">
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; background: #000; border-radius: 4px;">
          <iframe
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            src="https://www.youtube.com/embed/${youtubeId}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
        <div style="margin-top: 6px;">
          <a href="${escapeHtml(url)}" target="_blank" style="color: #4CAF50; text-decoration: none; font-size: 11px; word-break: break-all;">
            ${escapeHtml(url)}
          </a>
        </div>
      </div>
    `;
  }

  // Vimeo
  const vimeoId = extractVimeoVideoId(url);
  if (vimeoId) {
    return `
      <div style="margin-bottom: 10px;">
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; background: #000; border-radius: 4px;">
          <iframe
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            src="https://player.vimeo.com/video/${vimeoId}"
            frameborder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
        <div style="margin-top: 6px;">
          <a href="${escapeHtml(url)}" target="_blank" style="color: #4CAF50; text-decoration: none; font-size: 11px; word-break: break-all;">
            ${escapeHtml(url)}
          </a>
        </div>
      </div>
    `;
  }

  // その他のURL（リンクのみ）
  return `
    <div style="margin-bottom: 10px;">
      <a href="${escapeHtml(url)}" target="_blank" style="color: #4CAF50; text-decoration: none;">
        ${escapeHtml(url)}
      </a>
    </div>
  `;
}

/**
 * 配列をシャッフル
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * 所属のカラーコードを取得
 */
function getAffiliationColor(affiliationId) {
  if (!cachedMasterData || !cachedMasterData.affiliations) {
    return null;
  }
  const affiliation = cachedMasterData.affiliations.find(a => a.affiliation_id === affiliationId);
  return affiliation ? affiliation.color_code : null;
}

/**
 * セレクトボックス生成
 */
function createSelectOptions(items, valueKey, labelKey, selectedValue = '') {
  let html = '<option value="">選択してください</option>';
  items.forEach(item => {
    const selected = item[valueKey] === selectedValue ? 'selected' : '';
    html += `<option value="${escapeHtml(item[valueKey])}" ${selected}>${escapeHtml(item[labelKey])}</option>`;
  });
  return html;
}

/**
 * チェックボックス生成
 */
function createCheckboxes(items, valueKey, labelKey, selectedValues = []) {
  let html = '';
  items.forEach(item => {
    const checked = selectedValues.includes(item[valueKey]) ? 'checked' : '';
    html += `
      <label>
        <input type="checkbox" value="${escapeHtml(item[valueKey])}" ${checked}>
        ${escapeHtml(item[labelKey])}
      </label>
    `;
  });
  return html;
}

/**
 * ローディング表示
 */
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div style="text-align: center; padding: 50px;">読み込み中...</div>';
  }
}

/**
 * エラー表示
 */
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="message error">${escapeHtml(message)}</div>`;
  }
}
