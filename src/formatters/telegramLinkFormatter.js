function isResultEnvelope(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.status === 'string';
}

// 섹션 값은 세 형태로 온다: 결과 봉투 자체(usMarket), 봉투를 담은 배열(stockDetails),
// 봉투를 담은 객체(marketList·stockNews·secFilings). 컨테이너에는 status가 없어서
// 그대로 세면 수집 성공 여부와 무관하게 항상 실패로 잡힌다. 안쪽까지 펼쳐서 센다.
function collectResultEnvelopes(value) {
  if (isResultEnvelope(value)) {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectResultEnvelopes);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectResultEnvelopes);
  }
  return [];
}

function summarizeCollection(sections) {
  const envelopes = collectResultEnvelopes(sections);
  return {
    total: envelopes.length,
    failed: envelopes.filter((envelope) => envelope.status !== 'ok').length,
  };
}

// GitHub Pages doesn't allow custom cache-control headers, so browsers (and the
// Telegram in-app browser) can serve a stale copy of a URL they've seen before.
// Appending a unique query string per run makes each day's link a "new" URL,
// forcing a fresh fetch instead of a cached one.
function withCacheBuster(url) {
  return `${url}?v=${Date.now()}`;
}

function formatDashboardLinkMessage(sections, dashboardUrl) {
  // UTC가 아니라 한국 날짜 기준으로 제목을 만든다 (en-CA locale = YYYY-MM-DD).
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const { total, failed } = summarizeCollection(sections);
  const statusLine =
    failed > 0
      ? `⚠️ 전체 ${total}개 항목 중 ${failed}개를 가져오지 못했습니다. 대시보드에서 확인하세요.`
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
