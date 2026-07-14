const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../../../src/utils/rateLimiter');

test('allows calls up to the limit without delay', async () => {
  const limiter = createRateLimiter(5, 60000);
  const start = Date.now();

  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await limiter.acquire();
  }

  const elapsed = Date.now() - start;
  assert.ok(elapsed < 100, `expected no delay for calls within limit, got ${elapsed}ms`);
});

test('delays the call that exceeds the limit within the window', async () => {
  const windowMs = 200;
  const limiter = createRateLimiter(2, windowMs);

  await limiter.acquire();
  await limiter.acquire();

  const start = Date.now();
  await limiter.acquire();
  const elapsed = Date.now() - start;

  assert.ok(elapsed >= windowMs - 20, `expected delay near ${windowMs}ms, got ${elapsed}ms`);
});
