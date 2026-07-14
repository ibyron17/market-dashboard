const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { createRateLimiter } = require('../utils/rateLimiter');
const { ALPHA_VANTAGE_RATE_LIMIT } = require('../config/constants');

const BASE_URL = 'https://www.alphavantage.co/query';
const limiter = createRateLimiter(
  ALPHA_VANTAGE_RATE_LIMIT.maxPerWindow,
  ALPHA_VANTAGE_RATE_LIMIT.windowMs,
);

function assertNoApiError(body) {
  if (body && (body['Note'] || body['Error Message'] || body['Information'])) {
    const message = body['Note'] || body['Error Message'] || body['Information'];
    throw new Error(`Alpha Vantage API error: ${message}`);
  }
}

async function fetchAlphaVantage(params, { apiKey, timeoutMs = 10000 } = {}) {
  await limiter.acquire();

  return withRetry(async () => {
    const response = await axios.get(BASE_URL, {
      params: { ...params, apikey: apiKey },
      timeout: timeoutMs,
    });
    assertNoApiError(response.data);
    return response.data;
  });
}

module.exports = { fetchAlphaVantage };
