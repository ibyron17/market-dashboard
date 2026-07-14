function countFailedSections(sections) {
  return Object.values(sections).filter((section) => section && section.status !== 'ok').length;
}

// GitHub Pages doesn't allow custom cache-control headers, so browsers (and the
// Telegram in-app browser) can serve a stale copy of a URL they've seen before.
// Appending a unique query string per run makes each day's link a "new" URL,
// forcing a fresh fetch instead of a cached one.
function withCacheBuster(url) {
  return `${url}?v=${Date.now()}`;
}

function formatDashboardLinkMessage(sections, dashboardUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const failedCount = countFailedSections(sections);
  const statusLine =
    failedCount > 0
      ? `⚠️ 일부 항목(${failedCount}건)을 가져오지 못했습니다. 대시보드에서 확인하세요.`
      : '✅ 모든 데이터가 정상적으로 수집되었습니다.';

  return [
    `📊 ${today} 마켓 브리핑이 준비됐습니다.`,
    '',
    withCacheBuster(dashboardUrl),
    '',
    statusLine,
    '📌 참고용 정보이며 투자 조언이 아닙니다.',
  ].join('\n');
}

module.exports = { formatDashboardLinkMessage };
