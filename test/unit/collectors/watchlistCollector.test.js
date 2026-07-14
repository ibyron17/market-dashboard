const test = require('node:test');
const assert = require('node:assert/strict');
const { collectWatchlist } = require('../../../src/collectors/watchlistCollector');

const config = { fmpApiKey: 'test-key' };

const QUOTES_BY_SYMBOL = {
  NVDA: { symbol: 'NVDA', price: 130, changePercentage: 2.1 },
  TSM: { symbol: 'TSM', price: 205, changePercentage: 0.5 },
  AVGO: { symbol: 'AVGO', price: 1800, changePercentage: -0.4 },
  AMD: { symbol: 'AMD', price: 160, changePercentage: 1.1 },
  NEE: { symbol: 'NEE', price: 72, changePercentage: 0.2 },
  GEV: { symbol: 'GEV', price: 320, changePercentage: -1.2 },
  VST: { symbol: 'VST', price: 140, changePercentage: 3.4 },
  TSLA: { symbol: 'TSLA', price: 245, changePercentage: 0.8 },
  ALB: { symbol: 'ALB', price: 95, changePercentage: -0.6 },
  ENPH: { symbol: 'ENPH', price: 65, changePercentage: 1.9 },
};

test('returns ok status with companies grouped by theme', async () => {
  const fakeFetchFmp = async (path, params) => {
    const quote = QUOTES_BY_SYMBOL[params.symbol];
    return quote ? [quote] : [];
  };

  const result = await collectWatchlist(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'fmp-watchlist');
  assert.equal(result.data.themes.length, 3);

  const semiconductor = result.data.themes.find((t) => t.key === 'semiconductor');
  assert.equal(semiconductor.label, '반도체');
  assert.equal(semiconductor.companies.length, 4);
  assert.equal(semiconductor.companies[0].price, 130);
  assert.equal(semiconductor.companies[0].changesPercentage, 2.1);

  const power = result.data.themes.find((t) => t.key === 'power');
  assert.equal(power.companies.length, 3);

  const battery = result.data.themes.find((t) => t.key === 'battery');
  assert.equal(battery.companies.length, 3);
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
    if (params.symbol === 'NVDA') return [QUOTES_BY_SYMBOL.NVDA];
    return [];
  };

  const result = await collectWatchlist(config, { fetchFmp: fakeFetchFmp });

  const semiconductor = result.data.themes.find((t) => t.key === 'semiconductor');
  const tsm = semiconductor.companies.find((c) => c.symbol === 'TSM');
  assert.equal(tsm.price, null);
});
