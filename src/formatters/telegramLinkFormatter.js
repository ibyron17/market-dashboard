function countFailedSections(sections) {
  return Object.values(sections).filter((section) => section && section.status !== 'ok').length;
}

function formatDashboardLinkMessage(sections, dashboardUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const failedCount = countFailedSections(sections);
  const statusLine =
    failedCount > 0
      ? `⚠️ 일부 항목(${failedCount}건)을 가져오지 못했습니다. 대시보드에서 확인하세요.`
      : '✅ 모든 데이터가 정상적으로 수집되었습니다.';

  return [`📊 ${today} 데일리 마켓 리포트가 준비됐습니다.`, '', dashboardUrl, '', statusLine].join(
    '\n',
  );
}

module.exports = { formatDashboardLinkMessage };
