const test = require('node:test');
const assert = require('node:assert/strict');
const { scrapeKrMarket, parseIndexChange } = require('../../../src/scrapers/naverMarketScraper');

function createMockPage(values) {
  return {
    goto: async () => {},
    $eval: async (selector) => values[selector],
  };
}

test('parseIndexChange splits the combined Naver change text into signed parts', () => {
  // 네이버 마크업: 등락폭에 부호가 없고 방향은 "상승"/"하락" 단어로만 표시된다.
  assert.deepEqual(parseIndexChange('427.58 +6.24%상승'), {
    change: '+427.58',
    changePercent: '+6.24%',
  });
  assert.deepEqual(parseIndexChange('12.30 -1.05%하락'), {
    change: '-12.30',
    changePercent: '-1.05%',
  });
});

test('parseIndexChange returns nulls for unparseable text', () => {
  assert.deepEqual(parseIndexChange('로딩 중'), { change: null, changePercent: null });
});

test('returns ok status with parsed kospi/kosdaq values', async () => {
  const page = createMockPage({
    '#KOSPI_now': '2,650.12',
    '#KOSPI_change': '10.50 +0.40%상승',
    '#KOSDAQ_now': '860.44',
    '#KOSDAQ_change': '2.10 -0.24%하락',
  });

  const result = await scrapeKrMarket(page);

  assert.equal(result.status, 'ok');
  assert.equal(result.data.kospi.value, '2,650.12');
  assert.equal(result.data.kospi.change, '+10.50');
  assert.equal(result.data.kospi.changePercent, '+0.40%');
  assert.equal(result.data.kosdaq.change, '-2.10');
  assert.equal(result.data.kosdaq.changePercent, '-0.24%');
});

test('returns error status without throwing when navigation fails', async () => {
  const page = {
    goto: async () => {
      throw new Error('navigation timeout');
    },
    $eval: async () => '',
  };

  const result = await scrapeKrMarket(page);

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'navigation timeout');
});
