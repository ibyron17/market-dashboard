const { escapeHtml, changeClass, changeLabel } = require('../utils/htmlEscape');
const { GLOSSARY } = require('./glossary');

function renderCard(title, hint, bodyHtml) {
  return `
      <section class="card">
        <h2>${escapeHtml(title)}</h2>
        <p class="hint">${escapeHtml(hint)}</p>
        ${bodyHtml}
      </section>`;
}

function renderStatusCard(title, hint, section, renderBody) {
  if (!section || section.status !== 'ok') {
    return renderCard(title, hint, '<p class="warning">⚠️ 데이터를 가져오지 못했습니다.</p>');
  }
  return renderCard(title, hint, renderBody(section.data));
}

// A real <table> (rather than a flex/space-between list) so that the label/value/change
// columns line up vertically across rows regardless of how long each row's text is.
function renderTable(rows) {
  return `
        <table class="data-table">
          <tbody>
            ${rows
              .map(
                (cells) => `
            <tr>
              ${cells.map((cell) => `<td class="${cell.className || ''}">${cell.html}</td>`).join('')}
            </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;
}

function indexRow(label, price, changesPercentage) {
  return [
    { className: 'label', html: escapeHtml(label) },
    { className: 'value', html: price != null ? escapeHtml(price) : '데이터 없음' },
    {
      className: `change ${changeClass(changesPercentage)}`,
      html: `${escapeHtml(changeLabel(changesPercentage))}${changesPercentage != null ? ` (${escapeHtml(changesPercentage)}%)` : ''}`,
    },
  ];
}

function renderDisclaimer() {
  return `
      <div class="disclaimer">
        ⚠️ 이 대시보드는 정보 제공을 목적으로 하며 투자 조언이 아닙니다. 모든 투자 판단과 책임은 본인에게 있습니다.
      </div>`;
}

function countUpDown(values) {
  return values.reduce(
    (acc, value) => {
      const cls = changeClass(value);
      if (cls === 'up') return { up: acc.up + 1, down: acc.down };
      if (cls === 'down') return { up: acc.up, down: acc.down + 1 };
      return acc;
    },
    { up: 0, down: 0 },
  );
}

function renderSummary(sections) {
  const values = [];
  if (sections.usMarket && sections.usMarket.status === 'ok') {
    values.push(...sections.usMarket.data.indices.map((index) => index.changesPercentage));
  }
  if (sections.krMarket && sections.krMarket.status === 'ok') {
    values.push(sections.krMarket.data.kospi.change, sections.krMarket.data.kosdaq.change);
  }

  const { up, down } = countUpDown(values);
  let mood = '오늘 수집된 지수 데이터가 부족해 전반적인 분위기를 요약하기 어려워요.';
  if (up > down) {
    mood = `오늘은 상승한 지수(${up}개)가 하락한 지수(${down}개)보다 많았어요. 전반적으로 좋은 흐름이었어요.`;
  } else if (down > up) {
    mood = `오늘은 하락한 지수(${down}개)가 상승한 지수(${up}개)보다 많았어요. 전반적으로 조심스러운 흐름이었어요.`;
  } else if (up + down > 0) {
    mood = '오늘은 상승과 하락이 비슷하게 나타난, 방향성이 뚜렷하지 않은 날이었어요.';
  }

  return `
      <section class="card summary">
        <h2>📌 오늘의 요약</h2>
        <p>${escapeHtml(mood)}</p>
        <p class="hint">처음이신가요? 맨 위 AI 인사이트로 오늘 분위기를 먼저 파악한 뒤, 이 순서로 근거를 확인해보세요: ① 오늘의 요약 → ② 미국·국내 증시 → ③ 외국인·기관 동향 → ④ 관심 기업</p>
      </section>`;
}

function renderUsMarket(section) {
  return renderStatusCard(
    '🇺🇸 미국 증시',
    GLOSSARY.usMarket,
    section,
    (data) =>
      renderTable(data.indices.map((index) => indexRow(index.label, index.price, index.changesPercentage))),
  );
}

function vixInterpretation(price) {
  const numeric = Number(String(price).replace(/,/g, ''));
  if (Number.isNaN(numeric)) return '';
  return numeric >= 20
    ? '20 이상이라 시장이 다소 불안하다는 신호로 흔히 해석돼요.'
    : '20 미만이라 비교적 차분한 시장 분위기로 흔히 해석돼요.';
}

function renderVix(section) {
  return renderStatusCard(
    '😨 VIX (변동성지수)',
    GLOSSARY.vix,
    section,
    (data) => `
        <p class="treasury-value">${data.price != null ? escapeHtml(data.price) : '데이터 없음'}</p>
        <p class="change ${changeClass(data.changesPercentage)}">
          ${escapeHtml(changeLabel(data.changesPercentage))}
          ${data.changesPercentage != null ? `(${escapeHtml(data.changesPercentage)}%)` : ''}
        </p>
        ${data.price != null ? `<p class="hint" style="margin:0.5rem 0 0">${escapeHtml(vixInterpretation(data.price))}</p>` : ''}`,
  );
}

function renderFedFundsRate(section) {
  return renderStatusCard(
    '🏦 미국 기준금리',
    GLOSSARY.fedFunds,
    section,
    (data) => `
        <p class="treasury-value">${data.rate != null ? `${escapeHtml(data.rate)}%` : '데이터 없음'}</p>
        <p class="treasury-date">${data.date ? escapeHtml(data.date) : ''}</p>
        ${
          Array.isArray(data.history) && data.history.length > 1
            ? `<div class="rate-chart-wrap"><canvas id="fedFundsChart" height="90"></canvas></div>
        <script type="application/json" id="fedFundsChartData">${JSON.stringify(data.history).replace(/</g, '\\u003c')}</script>`
            : ''
        }`,
  );
}

function renderKrMarket(section) {
  return renderStatusCard(
    '🇰🇷 국내 증시',
    GLOSSARY.krMarket,
    section,
    (data) =>
      renderTable([
        [
          { className: 'label', html: '코스피' },
          { className: 'value', html: escapeHtml(data.kospi.value) },
          {
            className: `change ${changeClass(data.kospi.change)}`,
            html: `${escapeHtml(changeLabel(data.kospi.change))} (${escapeHtml(data.kospi.change)})`,
          },
        ],
        [
          { className: 'label', html: '코스닥' },
          { className: 'value', html: escapeHtml(data.kosdaq.value) },
          {
            className: `change ${changeClass(data.kosdaq.change)}`,
            html: `${escapeHtml(changeLabel(data.kosdaq.change))} (${escapeHtml(data.kosdaq.change)})`,
          },
        ],
      ]),
  );
}

function renderForeignFlow(section) {
  return renderStatusCard(
    '💱 외국인·기관 동향',
    GLOSSARY.foreignFlow,
    section,
    (data) =>
      renderTable([
        [
          { className: 'label', html: '외국인 순매수' },
          {
            className: `value ${changeClass(data.foreignNetBuy)}`,
            html: data.foreignNetBuy ? escapeHtml(data.foreignNetBuy) : '데이터 없음',
          },
        ],
        [
          { className: 'label', html: '기관 순매수' },
          {
            className: `value ${changeClass(data.institutionNetBuy)}`,
            html: data.institutionNetBuy ? escapeHtml(data.institutionNetBuy) : '데이터 없음',
          },
        ],
      ]),
  );
}

function renderTreasury(section) {
  return renderStatusCard(
    '💵 10년물 국채금리',
    GLOSSARY.treasury,
    section,
    (data) => `
        <p class="treasury-value">${data.yieldPercent != null ? `${escapeHtml(data.yieldPercent)}%` : '데이터 없음'}</p>
        <p class="treasury-date">${data.date ? escapeHtml(data.date) : ''}</p>`,
  );
}

function renderWatchlist(section) {
  return renderStatusCard(
    '🏢 오늘의 관심 기업',
    GLOSSARY.watchlist,
    section,
    (data) => `
        <div class="tabs" role="tablist" aria-label="관심 기업 테마">
          ${data.themes
            .map(
              (theme, i) => `
          <button type="button" class="tab-btn${i === 0 ? ' active' : ''}" role="tab" aria-selected="${i === 0}" data-tab-target="watchlist-${escapeHtml(theme.key)}">${escapeHtml(theme.label)}</button>`,
            )
            .join('')}
        </div>
        ${data.themes
          .map(
            (theme, i) => `
        <div class="tab-panel" id="watchlist-${escapeHtml(theme.key)}" role="tabpanel" ${i === 0 ? '' : 'hidden'}>
          ${renderTable(
            theme.companies.map((company) =>
              indexRow(`${company.label} (${company.symbol})`, company.price, company.changesPercentage),
            ),
          )}
        </div>`,
          )
          .join('')}`,
  );
}

function renderInsight(section) {
  if (!section || section.status !== 'ok') {
    return `
      <section class="card insight">
        <h2>🤖 AI 인사이트</h2>
        <p class="warning">⚠️ 인사이트를 생성하지 못했습니다.</p>
      </section>`;
  }
  return `
      <section class="card insight">
        <h2>🤖 AI 인사이트</h2>
        <p>${escapeHtml(section.data.text)}</p>
        <p class="hint">※ 위 내용은 데이터 기반 참고 정보이며 투자 조언이 아닙니다.</p>
      </section>`;
}

module.exports = {
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
};
