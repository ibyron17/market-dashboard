const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderDisclaimer,
  renderSummary,
  renderUsMarket,
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

test('renderWatchlist never suggests buying or selling a specific company', () => {
  const section = {
    status: 'ok',
    data: { companies: [{ label: '애플', symbol: 'AAPL', price: 200, changesPercentage: 0.8 }] },
  };
  const html = renderWatchlist(section);
  assert.match(html, /애플/);
  assert.ok(!/매수|매도|사세요|파세요/.test(html));
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
