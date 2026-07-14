const { escapeHtml } = require('../utils/htmlEscape');
const {
  renderDisclaimer,
  renderSummary,
  renderUsMarket,
  renderKrMarket,
  renderForeignFlow,
  renderTreasury,
  renderWatchlist,
  renderInsight,
} = require('./dashboardSections');

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
  .card h2 { margin: 0 0 0.5rem; font-size: 1.05rem; }
  .hint { color: #8a8f98; font-size: 0.85rem; margin: 0 0 0.75rem; line-height: 1.5; }
  .disclaimer {
    background: #2a1f0f;
    border: 1px solid #6b4e16;
    color: #fbbf24;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    margin-bottom: 1.25rem;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .summary p:first-of-type { font-size: 1.05rem; font-weight: 600; }
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
  .insight p { line-height: 1.6; margin: 0 0 0.5rem; }
</style>
</head>
<body>
<main>
  ${renderDisclaimer()}
  <h1>📊 ${escapeHtml(today)} 데일리 마켓 리포트</h1>
  <p class="generated-at">생성 시각: ${escapeHtml(generatedAt)}</p>
  ${renderSummary(sections)}
  ${renderUsMarket(sections.usMarket)}
  ${renderKrMarket(sections.krMarket)}
  ${renderForeignFlow(sections.foreignFlow)}
  ${renderTreasury(sections.treasury)}
  ${renderWatchlist(sections.watchlist)}
  ${renderInsight(sections.insight)}
  ${renderDisclaimer()}
</main>
</body>
</html>
`;
}

module.exports = { formatDashboardHtml };
