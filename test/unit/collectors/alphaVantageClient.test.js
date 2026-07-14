const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { fetchAlphaVantage } = require('../../../src/collectors/alphaVantageClient');

test('returns response data on success', async (t) => {
  t.mock.method(axios, 'get', async () => ({ data: { 'Global Quote': { price: '100' } } }));

  const data = await fetchAlphaVantage(
    { function: 'GLOBAL_QUOTE', symbol: 'SPY' },
    { apiKey: 'test-key' },
  );

  assert.deepEqual(data, { 'Global Quote': { price: '100' } });
});

test('throws when API responds with a rate-limit Note', async (t) => {
  t.mock.method(axios, 'get', async () => ({
    data: { Note: 'Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day.' },
  }));

  await assert.rejects(
    () => fetchAlphaVantage({ function: 'GLOBAL_QUOTE' }, { apiKey: 'test-key' }),
    /Alpha Vantage API error/,
  );
});

test('throws when API responds with an Error Message', async (t) => {
  t.mock.method(axios, 'get', async () => ({
    data: { 'Error Message': 'Invalid API call' },
  }));

  await assert.rejects(
    () => fetchAlphaVantage({ function: 'INVALID' }, { apiKey: 'test-key' }),
    /Invalid API call/,
  );
});
