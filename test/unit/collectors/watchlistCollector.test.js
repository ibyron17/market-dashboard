const test = require('node:test');
const assert = require('node:assert/strict');
const { collectWatchlist } = require('../../../src/collectors/watchlistCollector');

const config = { fmpApiKey: 'test-key' };

const QUOTES_BY_SYMBOL = {
  AAPL: { symbol: 'AAPL', price: 200, changePercentage: 0.8 },
  MSFT: { symbol: 'MSFT', price: 420, changePercentage: -0.3 },
  NVDA: { symbol: 'NVDA', price: 130, changePercentage: 2.1 },
  AMZN: { symbol: 'AMZN', price: 185, changePercentage: 0.4 },
  GOOGL: { symbol: 'GOOGL', price: 175, changePercentage: -0.1 },
};

test('returns ok status with mapped companies on success', async () => {
  const fakeFetchFmp = async (path, params) => {
    const quote = QUOTES_BY_SYMBOL[params.symbol];
    return quote ? [quote] : [];
  };

  const result = await collectWatchlist(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'fmp-watchlist');
  assert.equal(result.data.companies.length, 5);
  assert.equal(result.data.companies[0].price, 200);
  assert.equal(result.data.companies[0].changesPercentage, 0.8);
});

test('returns error status without throwing when fetch fails', async () => {
  const fakeFetchFmp = async () => {
    throw new Error('fmp down');
  };

  const result = await collectWatchlist(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'fmp down');
});

test('fills null values when a symbol is missing from the response', async () => {
  const fakeFetchFmp = async (path, params) => {
    if (params.symbol === 'AAPL') return [QUOTES_BY_SYMBOL.AAPL];
    return [];
  };

  const result = await collectWatchlist(config, { fetchFmp: fakeFetchFmp });

  const msft = result.data.companies.find((c) => c.symbol === 'MSFT');
  assert.equal(msft.price, null);
});
