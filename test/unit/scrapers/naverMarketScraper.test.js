const test = require('node:test');
const assert = require('node:assert/strict');
const { scrapeKrMarket } = require('../../../src/scrapers/naverMarketScraper');

function createMockPage(values) {
  return {
    goto: async () => {},
    $eval: async (selector) => values[selector],
  };
}

test('returns ok status with parsed kospi/kosdaq values', async () => {
  const page = createMockPage({
    '#KOSPI_now': '2,650.12',
    '#KOSPI_change': '+10.50',
    '#KOSDAQ_now': '860.44',
    '#KOSDAQ_change': '-2.10',
  });

  const result = await scrapeKrMarket(page);

  assert.equal(result.status, 'ok');
  assert.equal(result.data.kospi.value, '2,650.12');
  assert.equal(result.data.kosdaq.change, '-2.10');
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
