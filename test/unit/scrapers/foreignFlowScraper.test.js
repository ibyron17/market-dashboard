const test = require('node:test');
const assert = require('node:assert/strict');
const {
  scrapeForeignFlow,
  parseInvestorFlow,
} = require('../../../src/scrapers/foreignFlowScraper');

test('parseInvestorFlow extracts the last number from matching rows', () => {
  const rows = [
    '구분 개인 외국인 기관계',
    '외국인 순매수 -1,234',
    '기관 순매수 5,678',
  ];

  const result = parseInvestorFlow(rows);

  assert.equal(result.foreignNetBuy, '-1,234');
  assert.equal(result.institutionNetBuy, '5,678');
});

test('parseInvestorFlow returns null when no matching row exists', () => {
  const result = parseInvestorFlow(['아무 관련 없는 텍스트']);
  assert.equal(result.foreignNetBuy, null);
  assert.equal(result.institutionNetBuy, null);
});

test('scrapeForeignFlow returns ok status using mock page', async () => {
  const page = {
    goto: async () => {},
    $$eval: async () => ['외국인 순매수 -1,234', '기관 순매수 5,678'],
  };

  const result = await scrapeForeignFlow(page);

  assert.equal(result.status, 'ok');
  assert.equal(result.data.foreignNetBuy, '-1,234');
});

test('scrapeForeignFlow returns error status without throwing when navigation fails', async () => {
  const page = {
    goto: async () => {
      throw new Error('blocked by site');
    },
    $$eval: async () => [],
  };

  const result = await scrapeForeignFlow(page);

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'blocked by site');
});
