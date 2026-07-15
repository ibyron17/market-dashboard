const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInsightPrompt, hasUsableData } = require('../../../src/analysis/promptBuilder');

test('hasUsableData returns true when at least one section succeeded', () => {
  const sections = {
    usMarket: { status: 'ok', data: {} },
    krMarket: { status: 'error' },
  };
  assert.equal(hasUsableData(sections), true);
});

test('hasUsableData returns false when every section failed', () => {
  const sections = {
    usMarket: { status: 'error' },
    krMarket: { status: 'error' },
  };
  assert.equal(hasUsableData(sections), false);
});

test('buildInsightPrompt includes data for ok sections and "데이터 없음" for failed ones', () => {
  const sections = {
    usMarket: { status: 'ok', data: { indices: [{ symbol: 'SPY', price: 500 }] } },
    krMarket: { status: 'error', error: 'timeout' },
  };

  const prompt = buildInsightPrompt(sections);

  assert.match(prompt, /SPY/);
  assert.match(prompt, /국내 증시: 데이터 없음/);
});

test('buildInsightPrompt forbids buy/sell recommendations and redundant disclaimer sentences', () => {
  const prompt = buildInsightPrompt({ usMarket: { status: 'ok', data: {} } });

  assert.match(prompt, /매수\/매도 추천/);
  assert.match(prompt, /면책 문구는 덧붙이지 말 것/);
});

test('buildInsightPrompt includes VIX and Fed funds rate data when present', () => {
  const sections = {
    vix: { status: 'ok', data: { price: 18.4 } },
    fedFunds: { status: 'ok', data: { rate: 3.63 } },
  };

  const prompt = buildInsightPrompt(sections);

  assert.match(prompt, /VIX\(변동성지수\): .*18\.4/);
  assert.match(prompt, /미국 기준금리: .*3\.63/);
});

test('buildInsightPrompt includes watchlist data when present', () => {
  const sections = {
    watchlist: {
      status: 'ok',
      data: { themes: [{ key: 'semiconductor', label: '반도체', companies: [{ symbol: 'NVDA', price: 130 }] }] },
    },
  };

  const prompt = buildInsightPrompt(sections);

  assert.match(prompt, /NVDA/);
  assert.match(prompt, /관심 기업 동향/);
});
