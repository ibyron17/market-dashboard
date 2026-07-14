const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderDisclaimer,
  renderSummary,
  renderUsMarket,
  renderVix,
  renderFedFundsRate,
  renderWatchlist,
  renderInsight,
} = require('../../../src/formatters/dashboardSections');

test('renderDisclaimer mentions that this is not investment advice', () => {
  assert.match(renderDisclaimer(), /투자 조언이 아닙니다/);
});

test('renderSummary reports an upbeat mood when more indices rose than fell', () => {
  const sections = {
    usMarket: { status: 'ok', data: { indices: [{ changesPercentage: 1 }, { changesPercentage: 2 }] } },
    krMarket: { status: 'error' },
  };
  assert.match(renderSummary(sections), /좋은 흐름이었어요/);
});

test('renderSummary reports a cautious mood when more indices fell than rose', () => {
  const sections = {
    usMarket: { status: 'ok', data: { indices: [{ changesPercentage: -1 }, { changesPercentage: -2 }] } },
    krMarket: { status: 'error' },
  };
  assert.match(renderSummary(sections), /조심스러운 흐름이었어요/);
});

test('renderSummary reports a neutral mood on a tie', () => {
  const sections = {
    usMarket: { status: 'ok', data: { indices: [{ changesPercentage: 1 }, { changesPercentage: -1 }] } },
    krMarket: { status: 'error' },
  };
  assert.match(renderSummary(sections), /방향성이 뚜렷하지 않은 날/);
});

test('renderSummary falls back to a neutral message when no data is available', () => {
  const sections = { usMarket: { status: 'error' }, krMarket: { status: 'error' } };
  assert.match(renderSummary(sections), /요약하기 어려워요/);
});

test('renderUsMarket shows a beginner-friendly hint and interpretation label', () => {
  const section = {
    status: 'ok',
    data: { indices: [{ label: 'S&P 500', symbol: '^GSPC', price: 500, changesPercentage: 1.2 }] },
  };
  const html = renderUsMarket(section);
  assert.match(html, /대표 주가지수/);
  assert.match(html, /▲ 상승/);
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
        companies: [{ label: '엔비디아', symbol: 'NVDA', price: 130, changesPercentage: 2.1 }],
      },
      {
        key: 'power',
        label: '전력',
        companies: [{ label: '넥스트에라 에너지', symbol: 'NEE', price: 72, changesPercentage: 0.2 }],
      },
    ],
  },
};

test('renderWatchlist never suggests buying or selling a specific company', () => {
  const html = renderWatchlist(WATCHLIST_SECTION);
  assert.match(html, /엔비디아/);
  assert.ok(!/매수|매도|사세요|파세요/.test(html));
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

test('renderInsight appends a fixed disclaimer caption to the AI text', () => {
  const section = { status: 'ok', data: { text: '오늘은 상승 마감했습니다.' } };
  const html = renderInsight(section);
  assert.match(html, /참고 정보이며 투자 조언이 아닙니다/);
});
