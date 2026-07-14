const { escapeHtml } = require('../utils/htmlEscape');
const {
  renderDisclaimer,
  renderSummary,
  renderUsMarket,
  renderVix,
  renderKrMarket,
  renderForeignFlow,
  renderFedFundsRate,
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
<title>${escapeHtml(today)} 마켓 브리핑</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js" integrity="sha384-iU8HYtnGQ8Cy4zl7gbNMOhsDTTKX02BTXptVP/vqAWIaTfM7isw76iyZCsjL2eVi" crossorigin="anonymous"></script>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2rem 1rem 4rem;
    background: #f7f8fa;
    color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Pretendard, sans-serif;
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; color: #1a1a1a; }
  .generated-at { color: #777; font-size: 0.85rem; margin-bottom: 2rem; }
  .card {
    background: #ffffff;
    border: 1px solid #eaeaea;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  }
  .card h2 { margin: 0 0 0.5rem; font-size: 1.05rem; color: #1a1a1a; }
  .hint { color: #777; font-size: 0.85rem; margin: 0 0 0.75rem; line-height: 1.5; }
  .disclaimer {
    background: #fff8e6;
    border: 1px solid #f0dfa0;
    color: #7a5c00;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    margin-bottom: 1.25rem;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .summary p:first-of-type { font-size: 1.05rem; font-weight: 600; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  .data-table td { padding: 0.4rem 0; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table .label { color: #777; text-align: left; }
  .data-table .value { font-weight: 600; text-align: right; white-space: nowrap; padding-left: 0.75rem; }
  .data-table .change { text-align: right; white-space: nowrap; padding-left: 0.75rem; }
  .change.up, .value.up { color: #d92626; }
  .change.down, .value.down { color: #1a5fd4; }
  .warning { color: #b45309; margin: 0; }
  .treasury-value { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .treasury-date { color: #999; font-size: 0.85rem; margin: 0.25rem 0 0; }
  .rate-chart-wrap { margin-top: 0.75rem; height: 90px; }
  .insight p { line-height: 1.6; margin: 0 0 0.5rem; }
  .tabs { display: flex; gap: 1rem; margin-bottom: 0.75rem; border-bottom: 1px solid #eaeaea; }
  .tab-btn {
    appearance: none;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 0.4rem 0.1rem;
    margin-bottom: -1px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #999;
    cursor: pointer;
  }
  .tab-btn.active { color: #1a1a1a; border-bottom-color: #2a4d9b; }
</style>
</head>
<body>
<main>
  <h1>📊 ${escapeHtml(today)} 마켓 브리핑</h1>
  <p class="generated-at">생성 시각: ${escapeHtml(generatedAt)}</p>
  ${renderInsight(sections.insight)}
  ${renderSummary(sections)}
  ${renderUsMarket(sections.usMarket)}
  ${renderVix(sections.vix)}
  ${renderKrMarket(sections.krMarket)}
  ${renderForeignFlow(sections.foreignFlow)}
  ${renderFedFundsRate(sections.fedFunds)}
  ${renderTreasury(sections.treasury)}
  ${renderWatchlist(sections.watchlist)}
  ${renderDisclaimer()}
</main>
<script>
(function () {
  var canvas = document.getElementById('fedFundsChart');
  var dataEl = document.getElementById('fedFundsChartData');
  if (!canvas || !dataEl || typeof Chart === 'undefined') return;
  var points;
  try {
    points = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }
  if (!Array.isArray(points) || points.length < 2) return;

  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: points.map(function (p) { return String(p.date).slice(0, 7); }),
      datasets: [{
        data: points.map(function (p) { return p.value; }),
        borderColor: '#2a4d9b',
        backgroundColor: 'rgba(42,77,155,0.08)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.25,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { maxTicksLimit: 5, font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { font: { size: 9 } }, grid: { color: '#eef1f5' } },
      },
      plugins: { legend: { display: false } },
    },
  });
})();

(function () {
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    var buttons = tabs.querySelectorAll('.tab-btn');
    var panelContainer = tabs.parentElement;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-tab-target');
        buttons.forEach(function (b) {
          var isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panelContainer.querySelectorAll('.tab-panel').forEach(function (panel) {
          panel.hidden = panel.id !== targetId;
        });
      });
    });
  });
})();
</script>
</body>
</html>
`;
}

module.exports = { formatDashboardHtml };
