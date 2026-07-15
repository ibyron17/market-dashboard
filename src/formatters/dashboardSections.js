const { escapeHtml, changeClass, changeLabel, formatPercent } = require('../utils/htmlEscape');
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
// headers: 각 열의 숫자가 무엇을 뜻하는지 알려주는 컬럼 제목(초보자 배려).
function renderTable(rows, headers = []) {
  const headHtml =
    headers.length > 0
      ? `
          <thead>
            <tr>
              ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
            </tr>
          </thead>`
      : '';

  return `
        <table class="data-table">${headHtml}
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
  const percentText = formatPercent(changesPercentage);
  return [
    { className: 'label', html: escapeHtml(label) },
    { className: 'value', html: price != null ? escapeHtml(price) : '데이터 없음' },
    {
      className: `change ${changeClass(changesPercentage)}`,
      html: `${escapeHtml(changeLabel(changesPercentage))}${percentText ? ` (${escapeHtml(percentText)})` : ''}`,
    },
  ];
}

function renderDisclaimer() {
  return `
      <div class="disclaimer">
        ⚠️ 이 대시보드는 정보 제공을 목적으로 하며 투자 조언이 아닙니다. 모든 투자 판단과 책임은 본인에게 있습니다.
      </div>`;
}

function renderUsMarket(section) {
  return renderStatusCard(
    '🇺🇸 미국 증시',
    GLOSSARY.usMarket,
    section,
    (data) =>
      renderTable(
        data.indices.map((index) => indexRow(index.label, index.price, index.changesPercentage)),
        ['지수 이름', '현재 지수(포인트)', '전일 대비 등락'],
      ),
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
          ${formatPercent(data.changesPercentage) ? `(어제보다 ${escapeHtml(formatPercent(data.changesPercentage))})` : ''}
        </p>
        ${data.price != null ? `<p class="hint" style="margin:0.5rem 0 0">${escapeHtml(vixInterpretation(data.price))}</p>` : ''}`,
  );
}

// "2026-06-01" 같은 날짜를 "2026년 6월 기준"으로 바꿔, 월 단위 통계라는 점이 드러나게 한다.
function formatMonthLabel(dateStr) {
  const match = String(dateStr).match(/^(\d{4})-(\d{2})/);
  if (!match) return escapeHtml(dateStr);
  return `${match[1]}년 ${Number(match[2])}월 기준`;
}

function renderFedFundsRate(section) {
  return renderStatusCard(
    '🏦 미국 기준금리',
    GLOSSARY.fedFunds,
    section,
    (data) => `
        <p class="treasury-value">${data.rate != null ? `${escapeHtml(data.rate)}%` : '데이터 없음'}</p>
        <p class="treasury-date">${data.date ? formatMonthLabel(data.date) : ''}</p>
        ${
          Array.isArray(data.history) && data.history.length > 1
            ? `<div class="rate-chart-wrap"><canvas id="fedFundsChart" height="90"></canvas></div>
        <p class="hint" style="margin:0.5rem 0 0">위 차트는 최근 12개월 기준금리의 흐름이에요. 선이 내려가면 금리를 내리는(완화) 방향, 올라가면 올리는(긴축) 방향이에요. 기준금리는 월 평균으로 집계·발표되기 때문에 최신 값도 한두 달 전 기준이에요.</p>
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
      renderTable(
        [krIndexRow('코스피', data.kospi), krIndexRow('코스닥', data.kosdaq)],
        ['지수 이름', '현재 지수(포인트)', '전일 대비 등락'],
      ),
  );
}

// 네이버 스크레이퍼가 주는 { value, change: '+427.58', changePercent: '+6.24%' } 형태를 한 행으로.
function krIndexRow(label, index) {
  const detail = [index.change, index.changePercent].filter(Boolean).join(' / ');
  return [
    { className: 'label', html: escapeHtml(label) },
    { className: 'value', html: index.value != null ? escapeHtml(index.value) : '데이터 없음' },
    {
      className: `change ${changeClass(index.change)}`,
      html: `${escapeHtml(changeLabel(index.change))}${detail ? ` (${escapeHtml(detail)})` : ''}`,
    },
  ];
}

function renderForeignFlow(section) {
  return renderStatusCard(
    '💱 외국인·기관 동향',
    GLOSSARY.foreignFlow,
    section,
    (data) =>
      renderTable(
        [
          [
            { className: 'label', html: '외국인 순매수' },
            {
              className: `value ${changeClass(data.foreignNetBuy)}`,
              html: data.foreignNetBuy ? `${escapeHtml(data.foreignNetBuy)}억 원` : '데이터 없음',
            },
          ],
          [
            { className: 'label', html: '기관 순매수' },
            {
              className: `value ${changeClass(data.institutionNetBuy)}`,
              html: data.institutionNetBuy
                ? `${escapeHtml(data.institutionNetBuy)}억 원`
                : '데이터 없음',
            },
          ],
        ],
        ['투자자', '오늘 순매수 금액'],
      ),
  );
}

function renderTreasury(section) {
  return renderStatusCard(
    '💵 미국 10년 만기 국채금리',
    GLOSSARY.treasury,
    section,
    (data) => `
        <p class="treasury-value">${data.yieldPercent != null ? `${escapeHtml(data.yieldPercent)}%` : '데이터 없음'}</p>
        <p class="treasury-date">${data.date ? escapeHtml(data.date) : ''}</p>`,
  );
}

// 국내 기업은 원화("279,500원"), 해외 기업은 달러("95.87달러")로 단위를 붙여준다.
function formatCompanyPrice(company) {
  if (company.price == null) return null;
  const unit = company.currency === 'KRW' ? '원' : '달러';
  return `${company.price}${unit}`;
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
              indexRow(`${company.label} (${company.symbol})`, formatCompanyPrice(company), company.changesPercentage),
            ),
            ['기업 (종목코드)', '현재 주가', '전일 대비 등락'],
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
      </section>`;
}

module.exports = {
  renderDisclaimer,
  renderUsMarket,
  renderVix,
  renderKrMarket,
  renderForeignFlow,
  renderFedFundsRate,
  renderTreasury,
  renderWatchlist,
  renderInsight,
};
