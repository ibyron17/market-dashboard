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
  if (numeric > 0) return '▲ 상승';
  if (numeric < 0) return '▼ 하락';
  return '보합(변동 없음)';
}

module.exports = { escapeHtml, changeClass, changeLabel };
