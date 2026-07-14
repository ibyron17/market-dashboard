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

test('buildInsightPrompt forbids buy/sell recommendations and requires the disclaimer sentence', () => {
  const prompt = buildInsightPrompt({ usMarket: { status: 'ok', data: {} } });

  assert.match(prompt, /매수\/매도 추천/);
  assert.match(prompt, /참고용 정보이며 투자 판단과 책임은 본인에게 있습니다/);
});

test('buildInsightPrompt includes watchlist data when present', () => {
  const sections = {
    watchlist: { status: 'ok', data: { companies: [{ symbol: 'AAPL', price: 200 }] } },
  };

  const prompt = buildInsightPrompt(sections);

  assert.match(prompt, /AAPL/);
  assert.match(prompt, /관심 기업 동향/);
});
