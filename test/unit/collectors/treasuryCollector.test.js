const test = require('node:test');
const assert = require('node:assert/strict');
const { collectTreasuryYield } = require('../../../src/collectors/treasuryCollector');

const config = { alphaVantageApiKey: 'test-key' };

test('returns ok status with the latest yield value', async () => {
  const fakeFetchAlphaVantage = async () => ({
    data: [{ date: '2026-07-13', value: '4.25' }],
  });

  const result = await collectTreasuryYield(config, { fetchAlphaVantage: fakeFetchAlphaVantage });

  assert.equal(result.status, 'ok');
  assert.equal(result.data.yieldPercent, '4.25');
});

test('returns error status without throwing when fetch fails', async () => {
  const fakeFetchAlphaVantage = async () => {
    throw new Error('rate limited');
  };

  const result = await collectTreasuryYield(config, { fetchAlphaVantage: fakeFetchAlphaVantage });

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'rate limited');
});
