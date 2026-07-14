const test = require('node:test');
const assert = require('node:assert/strict');
const { formatReport, escapeMarkdown } = require('../../../src/formatters/reportFormatter');

test('escapeMarkdown escapes telegram markdown special characters', () => {
  assert.equal(escapeMarkdown('SPY_500*test`[x]'), 'SPY\\_500\\*test\\`\\[x]');
});

test('formatReport renders ok sections with data', () => {
  const sections = {
    usMarket: {
      status: 'ok',
      data: { indices: [{ label: 'S&P 500 (SPY)', symbol: 'SPY', price: 500, changesPercentage: 1.1 }] },
    },
    krMarket: {
      status: 'ok',
      data: { kospi: { value: '2,650', change: '+10' }, kosdaq: { value: '860', change: '-2' } },
    },
    foreignFlow: { status: 'ok', data: { foreignNetBuy: '-1,234', institutionNetBuy: '5,678' } },
    insight: { status: 'ok', data: { text: '오늘은 상승 마감했습니다.' } },
  };

  const result = formatReport(sections);

  assert.match(result, /S&P 500/);
  assert.match(result, /2,650/);
  assert.match(result, /-1,234/);
  assert.match(result, /상승 마감/);
});

test('formatReport shows a warning for every failed section', () => {
  const sections = {
    usMarket: { status: 'error', error: 'timeout' },
    krMarket: { status: 'error', error: 'timeout' },
    foreignFlow: { status: 'error', error: 'timeout' },
    insight: { status: 'error', error: 'skipped' },
  };

  const result = formatReport(sections);
  const warningCount = (result.match(/데이터를 가져오지 못했습니다/g) || []).length;

  assert.equal(warningCount, 3);
  assert.match(result, /인사이트를 생성하지 못했습니다/);
});
