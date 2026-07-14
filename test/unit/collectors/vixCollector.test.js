const test = require('node:test');
const assert = require('node:assert/strict');
const { collectVix } = require('../../../src/collectors/vixCollector');

const config = { fmpApiKey: 'test-key' };

test('returns ok status with the VIX quote on success', async () => {
  const fakeFetchFmp = async (path, params) => {
    assert.equal(params.symbol, '^VIX');
    return [{ symbol: '^VIX', price: 18.4, changePercentage: -2.1 }];
  };

  const result = await collectVix(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'fmp-vix');
  assert.equal(result.data.price, 18.4);
  assert.equal(result.data.changesPercentage, -2.1);
});

test('returns error status without throwing when fetch fails', async () => {
  const fakeFetchFmp = async () => {
    throw new Error('fmp down');
  };

  const result = await collectVix(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'fmp down');
});
