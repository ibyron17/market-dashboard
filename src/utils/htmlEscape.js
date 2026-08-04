function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function changeClass(value) {
  if (value == null) return '';
  const numeric = Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(numeric)) return '';
  return numeric > 0 ? 'up' : numeric < 0 ? 'down' : '';
}

function changeLabel(value) {
  if (value == null) return '데이터 없음';
  const numeric = Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(numeric)) return '데이터 없음';
  if (numeric > 0) return '▲';
  if (numeric < 0) return '▼';
  return '보합(변동 없음)';
}

// API가 주는 등락률은 소수점이 길어(예: 0.38521) 초보자가 읽기 어렵다.
// 부호를 명시한 두 자리 소수(+0.39%)로 통일해서 보여준다.
function formatPercent(value) {
  if (value == null) return null;
  const numeric = Number(String(value).replace(/,/g, '').replace(/%$/, ''));
  if (Number.isNaN(numeric)) return null;
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toFixed(2)}%`;
}

/**
 * HTML 엔티티를 원본 문자로 디코딩한다. 네이버 뉴스 API 응답 처리용.
 * &quot; &amp; &lt; &gt; &#39; 처리.
 * @param {string} text - HTML 엔티티 포함 문자열
 * @returns {string} 디코딩된 문자열
 */
function decodeHtmlEntities(text) {
  if (!text) return text;
  return String(text)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

module.exports = { escapeHtml, changeClass, changeLabel, formatPercent, decodeHtmlEntities };
