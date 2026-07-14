const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { fetchFmp } = require('../../../src/collectors/fmpClient');

test('returns response data on success', async (t) => {
  t.mock.method(axios, 'get', async () => ({ data: [{ symbol: 'SPY', price: 500 }] }));

  const data = await fetchFmp('/quote/SPY', {}, { apiKey: 'test-key' });

  assert.deepEqual(data, [{ symbol: 'SPY', price: 500 }]);
});

test('propagates network errors after retries are exhausted', async (t) => {
  t.mock.method(axios, 'get', async () => {
    throw new Error('network timeout');
  });

  await assert.rejects(
    () => fetchFmp('/quote/SPY', {}, { apiKey: 'test-key' }),
    /network timeout/,
  );
});
