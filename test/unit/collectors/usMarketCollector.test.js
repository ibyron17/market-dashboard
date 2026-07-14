const test = require('node:test');
const assert = require('node:assert/strict');
const { collectUsMarket } = require('../../../src/collectors/usMarketCollector');

const config = { fmpApiKey: 'test-key' };

test('returns ok status with mapped indices on success', async () => {
  const fakeFetchFmp = async () => [
    { symbol: 'SPY', price: 500, changesPercentage: 1.2 },
    { symbol: 'QQQ', price: 400, changesPercentage: -0.5 },
    { symbol: 'DIA', price: 380, changesPercentage: 0.1 },
  ];

  const result = await collectUsMarket(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'fmp-us-market');
  assert.equal(result.data.indices.length, 3);
  assert.equal(result.data.indices[0].price, 500);
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
  const fakeFetchFmp = async () => [{ symbol: 'SPY', price: 500, changesPercentage: 1.2 }];

  const result = await collectUsMarket(config, { fetchFmp: fakeFetchFmp });

  const qqq = result.data.indices.find((i) => i.symbol === 'QQQ');
  assert.equal(qqq.price, null);
});
