const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchTickerQuote } = require('../../../src/collectors/fmpTickerQuote');

const config = { fmpApiKey: 'test-key' };
const ticker = { symbol: 'AAPL', label: '애플' };

test('maps a successful quote response to the shared ticker shape', async () => {
  const fakeFetchFmp = async () => [{ symbol: 'AAPL', price: 200, changePercentage: 0.8 }];

  const result = await fetchTickerQuote(ticker, config, { fetchFmp: fakeFetchFmp });

  assert.deepEqual(result, { label: '애플', symbol: 'AAPL', price: 200, changesPercentage: 0.8 });
});

test('fills null price/change when the response has no matching quote', async () => {
  const fakeFetchFmp = async () => [];

  const result = await fetchTickerQuote(ticker, config, { fetchFmp: fakeFetchFmp });

  assert.deepEqual(result, { label: '애플', symbol: 'AAPL', price: null, changesPercentage: null });
});
