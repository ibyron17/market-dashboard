const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderDisclaimer,
  renderUsMarket,
  renderVix,
  renderKrMarket,
  renderForeignFlow,
  renderFedFundsRate,
  renderTreasury,
  renderWatchlist,
  renderInsight,
} = require('../../../src/formatters/dashboardSections');

test('renderDisclaimer mentions that this is not investment advice', () => {
  assert.match(renderDisclaimer(), /투자 조언이 아닙니다/);
});

test('renderUsMarket shows a beginner-friendly hint and interpretation label', () => {
  const section = {
    status: 'ok',
    data: { indices: [{ label: 'S&P 500', symbol: '^GSPC', price: 500, changesPercentage: 1.2 }] },
  };
  const html = renderUsMarket(section);
  assert.match(html, /대표 주가지수/);
  assert.match(html, /▲/);
});

test('renderUsMarket labels what the numbers mean and rounds percentages to 2 decimals', () => {
  const section = {
    status: 'ok',
    data: {
      indices: [{ label: 'S&P 500', symbol: '^GSPC', price: 7544.29, changesPercentage: 0.38521 }],
    },
  };
  const html = renderUsMarket(section);
  assert.match(html, /<th>지수 이름<\/th>/);
  assert.match(html, /<th>현재 지수\(포인트\)<\/th>/);
  assert.match(html, /<th>전일 대비 등락<\/th>/);
  assert.match(html, /\+0\.39%/);
  assert.ok(!html.includes('0.38521'));
});

test('renderKrMarket shows signed change with percent from the scraper fields', () => {
  const section = {
    status: 'ok',
    data: {
      kospi: { value: '7,284.41', change: '+427.58', changePercent: '+6.24%' },
      kosdaq: { value: '823.51', change: '-2.10', changePercent: '-0.24%' },
    },
  };
  const html = renderKrMarket(section);
  assert.match(html, /7,284\.41/);
  assert.match(html, /▲ \(\+427\.58 \/ \+6\.24%\)/);
  assert.match(html, /▼ \(-2\.10 \/ -0\.24%\)/);
});

test('renderForeignFlow appends the 억 원 unit so the amount is understandable', () => {
  const section = {
    status: 'ok',
    data: { foreignNetBuy: '+23,031', institutionNetBuy: '-1,992' },
  };
  const html = renderForeignFlow(section);
  assert.match(html, /\+23,031억 원/);
  assert.match(html, /-1,992억 원/);
});

test('renderTreasury names the card without unexplained jargon', () => {
  const html = renderTreasury({ status: 'ok', data: { date: '2026-07-13', yieldPercent: '4.62' } });
  assert.match(html, /미국 10년 만기 국채금리/);
  assert.ok(!html.includes('10년물')); // "10년물" 용어 자체를 노출하지 않는다
});

test('renderVix shows a beginner-friendly interpretation of the fear-gauge level', () => {
  const highFear = renderVix({ status: 'ok', data: { price: 24.5, changesPercentage: 3.1 } });
  assert.match(highFear, /24\.5/);
  assert.match(highFear, /다소 불안하다는 신호/);

  const calm = renderVix({ status: 'ok', data: { price: 13.2, changesPercentage: -1.4 } });
  assert.match(calm, /차분한 시장 분위기/);
});

test('renderVix shows a warning card when the section failed', () => {
  const html = renderVix({ status: 'error', error: 'timeout' });
  assert.match(html, /데이터를 가져오지 못했습니다/);
});

test('renderFedFundsRate shows the latest rate and embeds chart data when history exists', () => {
  const section = {
    status: 'ok',
    data: {
      rate: 3.63,
      date: '2026-06-01',
      history: [
        { date: '2026-05-01', value: 3.63 },
        { date: '2026-06-01', value: 3.63 },
      ],
    },
  };
  const html = renderFedFundsRate(section);
  assert.match(html, /3\.63%/);
  assert.match(html, /2026년 6월 기준/);
  assert.match(html, /최근 12개월 기준금리의 흐름/);
  assert.match(html, /id="fedFundsChart"/);
  assert.match(html, /id="fedFundsChartData"/);
});

test('renderFedFundsRate omits the chart markup when there is no history', () => {
  const html = renderFedFundsRate({ status: 'ok', data: { rate: 3.63, date: '2026-06-01', history: [] } });
  assert.ok(!html.includes('fedFundsChart'));
});

const WATCHLIST_SECTION = {
  status: 'ok',
  data: {
    themes: [
      {
        key: 'semiconductor',
        label: '반도체',
        companies: [
          { label: '삼성전자', symbol: '005930', price: '279,500', changesPercentage: 6.27, currency: 'KRW' },
          { label: '엔비디아', symbol: 'NVDA', price: 211.63, changesPercentage: 2.1, currency: 'USD' },
        ],
      },
      {
        key: 'power',
        label: '전력',
        companies: [
          { label: '두산에너빌리티', symbol: '034020', price: '65,000', changesPercentage: 0.2, currency: 'KRW' },
        ],
      },
    ],
  },
};

test('renderWatchlist never suggests buying or selling a specific company', () => {
  const html = renderWatchlist(WATCHLIST_SECTION);
  assert.match(html, /엔비디아/);
  assert.ok(!/매수|매도|사세요|파세요/.test(html));
});

test('renderWatchlist appends the currency unit per company (원/달러)', () => {
  const html = renderWatchlist(WATCHLIST_SECTION);
  assert.match(html, /279,500원/);
  assert.match(html, /211\.63달러/);
});

test('renderWatchlist renders a tab button and panel per theme, with only the first panel visible', () => {
  const html = renderWatchlist(WATCHLIST_SECTION);

  assert.match(html, /class="tab-btn active"[^>]*data-tab-target="watchlist-semiconductor"/);
  assert.match(html, /class="tab-btn"[^>]*data-tab-target="watchlist-power"/);
  assert.match(html, /id="watchlist-semiconductor"[^>]*role="tabpanel"\s*>/);
  assert.match(html, /id="watchlist-power"[^>]*role="tabpanel" hidden>/);
});

test('renderWatchlist shows a warning card when the section failed', () => {
  const html = renderWatchlist({ status: 'error', error: 'timeout' });
  assert.match(html, /데이터를 가져오지 못했습니다/);
});

test('renderInsight shows only the AI text without an extra disclaimer caption', () => {
  const section = { status: 'ok', data: { text: '오늘은 상승 마감했습니다.' } };
  const html = renderInsight(section);
  assert.match(html, /오늘은 상승 마감했습니다\./);
  assert.ok(!html.includes('투자 조언이 아닙니다'));
});
