const test = require('node:test');
const assert = require('node:assert/strict');
const { collectFedFundsRate } = require('../../../src/collectors/fedFundsCollector');

const config = { alphaVantageApiKey: 'test-key' };

test('returns ok status with the latest rate and chronological history', async () => {
  const fakeFetchAlphaVantage = async (params) => {
    assert.equal(params.function, 'FEDERAL_FUNDS_RATE');
    assert.equal(params.interval, 'monthly');
    return {
      name: 'Effective Federal Funds Rate',
      data: [
        { date: '2026-06-01', value: '3.63' },
        { date: '2026-05-01', value: '3.63' },
        { date: '2026-04-01', value: '3.64' },
      ],
    };
  };

  const result = await collectFedFundsRate(config, { fetchAlphaVantage: fakeFetchAlphaVantage });

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'alpha-vantage-fed-funds-rate');
  assert.equal(result.data.rate, 3.63);
  assert.equal(result.data.date, '2026-06-01');
  assert.deepEqual(result.data.history, [
    { date: '2026-04-01', value: 3.64 },
    { date: '2026-05-01', value: 3.63 },
    { date: '2026-06-01', value: 3.63 },
  ]);
});

test('returns error status without throwing when fetch fails', async () => {
  const fakeFetchAlphaVantage = async () => {
    throw new Error('alpha vantage down');
  };

  const result = await collectFedFundsRate(config, { fetchAlphaVantage: fakeFetchAlphaVantage });

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'alpha vantage down');
});

test('returns nulls when the response is empty', async () => {
  const fakeFetchAlphaVantage = async () => ({});

  const result = await collectFedFundsRate(config, { fetchAlphaVantage: fakeFetchAlphaVantage });

  assert.equal(result.status, 'ok');
  assert.equal(result.data.rate, null);
  assert.equal(result.data.date, null);
  assert.deepEqual(result.data.history, []);
});
