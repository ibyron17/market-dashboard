const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { createRateLimiter } = require('../utils/rateLimiter');
const { ALPHA_VANTAGE_RATE_LIMIT } = require('../config/constants');

const BASE_URL = 'https://www.alphavantage.co/query';
const limiter = createRateLimiter(
  ALPHA_VANTAGE_RATE_LIMIT.maxPerWindow,
  ALPHA_VANTAGE_RATE_LIMIT.windowMs,
  ALPHA_VANTAGE_RATE_LIMIT.minGapMs,
);

function assertNoApiError(body) {
  if (body && (body['Note'] || body['Error Message'] || body['Information'])) {
    const message = body['Note'] || body['Error Message'] || body['Information'];
    throw new Error(`Alpha Vantage API error: ${message}`);
  }
}

// limiter.acquire()는 withRetry 안에서 호출한다. 밖에서 한 번만 획득하면
// 재시도가 리미터를 거치지 않고 0.5초 간격으로 몰아쳐서, 버스트 제한(초당 1회)에
// 걸린 요청이 재시도마저 같은 이유로 전부 소진해 버린다.
async function fetchAlphaVantage(params, { apiKey, timeoutMs = 10000, rateLimiter = limiter } = {}) {
  return withRetry(async () => {
    await rateLimiter.acquire();
    const response = await axios.get(BASE_URL, {
      params: { ...params, apikey: apiKey },
      timeout: timeoutMs,
    });
    assertNoApiError(response.data);
    return response.data;
  });
}

module.exports = { fetchAlphaVantage };
