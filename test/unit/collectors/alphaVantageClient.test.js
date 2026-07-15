const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { fetchAlphaVantage } = require('../../../src/collectors/alphaVantageClient');

// 테스트에서는 지연 없는 스텁 리미터를 주입한다. 기본(공용) 리미터는 호출 간
// 2초 간격을 강제하므로 테스트가 불필요하게 느려지고 서로 간섭한다.
function instantLimiter() {
  const calls = { count: 0 };
  return {
    calls,
    acquire: async () => {
      calls.count += 1;
    },
  };
}

test('returns response data on success', async (t) => {
  t.mock.method(axios, 'get', async () => ({ data: { 'Global Quote': { price: '100' } } }));

  const data = await fetchAlphaVantage(
    { function: 'GLOBAL_QUOTE', symbol: 'SPY' },
    { apiKey: 'test-key', rateLimiter: instantLimiter() },
  );

  assert.deepEqual(data, { 'Global Quote': { price: '100' } });
});

test('throws when API responds with a rate-limit Note', async (t) => {
  t.mock.method(axios, 'get', async () => ({
    data: { Note: 'Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day.' },
  }));

  await assert.rejects(
    () => fetchAlphaVantage({ function: 'GLOBAL_QUOTE' }, { apiKey: 'test-key', rateLimiter: instantLimiter() }),
    /Alpha Vantage API error/,
  );
});

test('throws when API responds with an Error Message', async (t) => {
  t.mock.method(axios, 'get', async () => ({
    data: { 'Error Message': 'Invalid API call' },
  }));

  await assert.rejects(
    () => fetchAlphaVantage({ function: 'INVALID' }, { apiKey: 'test-key', rateLimiter: instantLimiter() }),
    /Invalid API call/,
  );
});

test('re-acquires the rate limiter on every retry attempt', async (t) => {
  // 버스트 제한에 걸린 요청이 재시도할 때도 리미터를 다시 거쳐야
  // (간격을 두고 재시도해야) 같은 이유로 또 실패하지 않는다.
  const limiter = instantLimiter();
  t.mock.method(axios, 'get', async () => ({
    data: { Note: 'please spread out your requests' },
  }));

  await assert.rejects(
    () => fetchAlphaVantage({ function: 'GLOBAL_QUOTE' }, { apiKey: 'test-key', rateLimiter: limiter }),
    /Alpha Vantage API error/,
  );

  assert.equal(limiter.calls.count, 3); // 최초 1회 + 재시도 2회
});
