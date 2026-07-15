const test = require('node:test');
const assert = require('node:assert/strict');
const {
  scrapeForeignFlow,
  parseInvestorFlow,
} = require('../../../src/scrapers/foreignFlowScraper');

test('parseInvestorFlow extracts signed amounts from the lst_kos_info items', () => {
  // 네이버 투자자별 매매동향은 "외국인 +23,031억" 형태의 <dd> 텍스트로 온다(단위: 억 원).
  const rows = ['개인 -24,666억', '외국인 +23,031억', '기관 +1,992억'];

  const result = parseInvestorFlow(rows);

  assert.equal(result.foreignNetBuy, '+23,031');
  assert.equal(result.institutionNetBuy, '+1,992');
});

test('parseInvestorFlow keeps negative amounts', () => {
  const result = parseInvestorFlow(['외국인 -1,234억', '기관 -567억']);
  assert.equal(result.foreignNetBuy, '-1,234');
  assert.equal(result.institutionNetBuy, '-567');
});

test('parseInvestorFlow returns null when no matching row exists', () => {
  const result = parseInvestorFlow(['아무 관련 없는 텍스트']);
  assert.equal(result.foreignNetBuy, null);
  assert.equal(result.institutionNetBuy, null);
});

test('scrapeForeignFlow returns ok status using mock page', async () => {
  const page = {
    goto: async () => {},
    $$eval: async () => ['개인 -24,666억', '외국인 +23,031억', '기관 +1,992억'],
  };

  const result = await scrapeForeignFlow(page);

  assert.equal(result.status, 'ok');
  assert.equal(result.data.foreignNetBuy, '+23,031');
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
