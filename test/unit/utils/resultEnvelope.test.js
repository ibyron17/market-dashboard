const test = require('node:test');
const assert = require('node:assert/strict');
const { withResultEnvelope } = require('../../../src/utils/resultEnvelope');

test('wraps a successful fn result in an ok envelope', async () => {
  const result = await withResultEnvelope('test-source', 'failed', async () => ({ value: 42 }));

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'test-source');
  assert.deepEqual(result.data, { value: 42 });
  assert.ok(result.fetchedAt);
});

test('wraps a thrown error in an error envelope without rethrowing', async () => {
  const result = await withResultEnvelope('test-source', 'failed', async () => {
    throw new Error('boom');
  });

  assert.equal(result.status, 'error');
  assert.equal(result.source, 'test-source');
  assert.equal(result.error, 'boom');
});
