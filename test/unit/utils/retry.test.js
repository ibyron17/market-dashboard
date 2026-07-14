const test = require('node:test');
const assert = require('node:assert/strict');
const { withRetry } = require('../../../src/utils/retry');

test('resolves on first try when fn succeeds immediately', async () => {
  const fn = async () => 'ok';
  const result = await withRetry(fn, { retries: 2, baseDelayMs: 1 });
  assert.equal(result, 'ok');
});

test('retries and eventually resolves after transient failures', async () => {
  let attempts = 0;
  const fn = async () => {
    attempts += 1;
    if (attempts < 3) {
      throw new Error('transient');
    }
    return 'recovered';
  };

  const result = await withRetry(fn, { retries: 3, baseDelayMs: 1 });
  assert.equal(result, 'recovered');
  assert.equal(attempts, 3);
});

test('throws the last error once retries are exhausted', async () => {
  const fn = async () => {
    throw new Error('always fails');
  };

  await assert.rejects(() => withRetry(fn, { retries: 1, baseDelayMs: 1 }), /always fails/);
});
