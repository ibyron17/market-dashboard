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

function renderStatusCard(title, section, renderBody) {
  if (!section || section.status !== 'ok') {
    return `
      <section class="card">
        <h2>${escapeHtml(title)}</h2>
        <p class="warning">⚠️ 데이터를 가져오지 못했습니다.</p>
      </section>`;
  }
  return `
      <section class="card">
        <h2>${escapeHtml(title)}</h2>
        ${renderBody(section.data)}
      </section>`;
}

function renderUsMarket(section) {
  return renderStatusCard('🇺🇸 미국 증시', section, (data) => `
        <ul class="index-list">
          ${data.indices
            .map(
              (index) => `
          <li>
            <span class="label">${escapeHtml(index.label)}</span>
            <span class="value">${index.price != null ? escapeHtml(index.price) : '데이터 없음'}</span>
            <span class="change ${changeClass(index.changesPercentage)}">${
                index.changesPercentage != null ? `${escapeHtml(index.changesPercentage)}%` : ''
              }</span>
          </li>`,
            )
            .join('')}
        </ul>`);
}

function renderKrMarket(section) {
  return renderStatusCard('🇰🇷 국내 증시', section, (data) => `
        <ul class="index-list">
          <li>
            <span class="label">코스피</span>
            <span class="value">${escapeHtml(data.kospi.value)}</span>
            <span class="change ${changeClass(data.kospi.change)}">${escapeHtml(data.kospi.change)}</span>
          </li>
          <li>
            <span class="label">코스닥</span>
            <span class="value">${escapeHtml(data.kosdaq.value)}</span>
            <span class="change ${changeClass(data.kosdaq.change)}">${escapeHtml(data.kosdaq.change)}</span>
          </li>
        </ul>`);
}

function renderForeignFlow(section) {
  return renderStatusCard('💱 외국인·기관 동향', section, (data) => `
        <ul class="index-list">
          <li>
            <span class="label">외국인 순매수</span>
            <span class="value ${changeClass(data.foreignNetBuy)}">${
              data.foreignNetBuy ? escapeHtml(data.foreignNetBuy) : '데이터 없음'
            }</span>
          </li>
          <li>
            <span class="label">기관 순매수</span>
            <span class="value ${changeClass(data.institutionNetBuy)}">${
              data.institutionNetBuy ? escapeHtml(data.institutionNetBuy) : '데이터 없음'
            }</span>
          </li>
        </ul>`);
}

function renderTreasury(section) {
  return renderStatusCard('💵 10년물 국채금리', section, (data) => `
        <p class="treasury-value">${data.yieldPercent != null ? `${escapeHtml(data.yieldPercent)}%` : '데이터 없음'}</p>
        <p class="treasury-date">${data.date ? escapeHtml(data.date) : ''}</p>`);
}

function renderInsight(section) {
  if (!section || section.status !== 'ok') {
    return `
      <section class="card insight">
        <h2>🤖 Claude 인사이트</h2>
        <p class="warning">⚠️ 인사이트를 생성하지 못했습니다.</p>
      </section>`;
  }
  return `
      <section class="card insight">
        <h2>🤖 Claude 인사이트</h2>
        <p>${escapeHtml(section.data.text)}</p>
      </section>`;
}

function formatDashboardHtml(sections) {
  const today = new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>${escapeHtml(today)} 데일리 마켓 리포트</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2rem 1rem 4rem;
    background: #0f1115;
    color: #e6e6e6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Pretendard, sans-serif;
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  .generated-at { color: #8a8f98; font-size: 0.85rem; margin-bottom: 2rem; }
  .card {
    background: #181b21;
    border: 1px solid #262b33;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
  }
  .card h2 { margin: 0 0 0.75rem; font-size: 1.05rem; }
  .index-list { list-style: none; margin: 0; padding: 0; }
  .index-list li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid #22262d;
    font-size: 0.95rem;
  }
  .index-list li:last-child { border-bottom: none; }
  .label { color: #a9adb4; }
  .value { font-weight: 600; }
  .change.up, .value.up { color: #4ade80; }
  .change.down, .value.down { color: #f87171; }
  .warning { color: #fbbf24; margin: 0; }
  .treasury-value { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .treasury-date { color: #8a8f98; font-size: 0.85rem; margin: 0.25rem 0 0; }
  .insight p { line-height: 1.6; margin: 0; }
</style>
</head>
<body>
<main>
  <h1>📊 ${escapeHtml(today)} 데일리 마켓 리포트</h1>
  <p class="generated-at">생성 시각: ${escapeHtml(generatedAt)}</p>
  ${renderUsMarket(sections.usMarket)}
  ${renderKrMarket(sections.krMarket)}
  ${renderForeignFlow(sections.foreignFlow)}
  ${renderTreasury(sections.treasury)}
  ${renderInsight(sections.insight)}
</main>
</body>
</html>
`;
}

module.exports = { formatDashboardHtml, escapeHtml };
