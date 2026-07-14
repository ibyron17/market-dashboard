const axios = require('axios');
const { withRetry } = require('../utils/retry');

// /api/v3 is legacy and returns 403 for accounts created after 2025-08-31; use /stable instead.
const BASE_URL = 'https://financialmodelingprep.com/stable';

async function fetchFmp(path, params = {}, { apiKey, timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}${path}`, {
      params: { ...params, apikey: apiKey },
      timeout: timeoutMs,
    });
    return response.data;
  });
}

module.exports = { fetchFmp };
