const test = require('node:test');
const assert = require('node:assert/strict');
const { collectUsMarket } = require('../../../src/collectors/usMarketCollector');

const config = { fmpApiKey: 'test-key' };

const QUOTES_BY_SYMBOL = {
  '^GSPC': { symbol: '^GSPC', price: 500, changePercentage: 1.2 },
  '^IXIC': { symbol: '^IXIC', price: 400, changePercentage: -0.5 },
  '^DJI': { symbol: '^DJI', price: 380, changePercentage: 0.1 },
};

test('returns ok status with mapped indices on success', async () => {
  const fakeFetchFmp = async (path, params) => {
    const quote = QUOTES_BY_SYMBOL[params.symbol];
    return quote ? [quote] : [];
  };

  const result = await collectUsMarket(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'fmp-us-market');
  assert.equal(result.data.indices.length, 3);
  assert.equal(result.data.indices[0].price, 500);
  assert.equal(result.data.indices[0].changesPercentage, 1.2);
});

test('returns error status without throwing when fetch fails', async () => {
  const fakeFetchFmp = async () => {
    throw new Error('fmp down');
  };

  const result = await collectUsMarket(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'fmp down');
});

test('fills null values when a symbol is missing from the response', async () => {
  const fakeFetchFmp = async (path, params) => {
    if (params.symbol === '^GSPC') return [QUOTES_BY_SYMBOL['^GSPC']];
    return [];
  };

  const result = await collectUsMarket(config, { fetchFmp: fakeFetchFmp });

  const nasdaq = result.data.indices.find((i) => i.symbol === '^IXIC');
  assert.equal(nasdaq.price, null);
});
