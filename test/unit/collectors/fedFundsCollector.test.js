const test = require('node:test');
const assert = require('node:assert/strict');
const { collectFedFundsRate } = require('../../../src/collectors/fedFundsCollector');

const config = { fmpApiKey: 'test-key' };

test('returns ok status with the latest rate and chronological history', async () => {
  const fakeFetchFmp = async (path, params) => {
    assert.equal(path, '/economic-indicators');
    assert.equal(params.name, 'federalFunds');
    return [
      { name: 'federalFunds', date: '2026-06-01', value: 3.63 },
      { name: 'federalFunds', date: '2026-05-01', value: 3.63 },
      { name: 'federalFunds', date: '2026-04-01', value: 3.64 },
    ];
  };

  const result = await collectFedFundsRate(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'fmp-fed-funds-rate');
  assert.equal(result.data.rate, 3.63);
  assert.equal(result.data.date, '2026-06-01');
  assert.deepEqual(result.data.history, [
    { date: '2026-04-01', value: 3.64 },
    { date: '2026-05-01', value: 3.63 },
    { date: '2026-06-01', value: 3.63 },
  ]);
});

test('returns error status without throwing when fetch fails', async () => {
  const fakeFetchFmp = async () => {
    throw new Error('fmp down');
  };

  const result = await collectFedFundsRate(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'fmp down');
});

test('returns nulls when the response is empty', async () => {
  const fakeFetchFmp = async () => [];

  const result = await collectFedFundsRate(config, { fetchFmp: fakeFetchFmp });

  assert.equal(result.status, 'ok');
  assert.equal(result.data.rate, null);
  assert.equal(result.data.date, null);
  assert.deepEqual(result.data.history, []);
});
