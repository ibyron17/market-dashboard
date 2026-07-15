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

test('spaces out concurrent acquires by minGapMs (burst prevention)', async () => {
  // Alpha Vantage 무료 키의 "초당 1회" 버스트 제한 재현 방지: 여러 수집기가
  // 동시에 acquire()해도 같은 순간에 통과하면 안 된다.
  const minGapMs = 100;
  const limiter = createRateLimiter(10, 60000, minGapMs);
  const start = Date.now();

  const finishedAt = await Promise.all(
    [0, 1, 2].map(() => limiter.acquire().then(() => Date.now() - start)),
  );

  const sorted = [...finishedAt].sort((a, b) => a - b);
  assert.ok(sorted[1] - sorted[0] >= minGapMs - 20, `gap1 too small: ${sorted[1] - sorted[0]}ms`);
  assert.ok(sorted[2] - sorted[1] >= minGapMs - 20, `gap2 too small: ${sorted[2] - sorted[1]}ms`);
});

test('enforces both the window cap and the minimum gap together', async () => {
  const limiter = createRateLimiter(2, 300, 50);

  const start = Date.now();
  await limiter.acquire(); // 즉시
  await limiter.acquire(); // +50ms (min gap)
  await limiter.acquire(); // 창(300ms)이 열릴 때까지 대기
  const elapsed = Date.now() - start;

  assert.ok(elapsed >= 280, `expected to wait for the window, got ${elapsed}ms`);
});
