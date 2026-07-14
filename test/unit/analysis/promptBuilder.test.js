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
