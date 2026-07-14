const axios = require('axios');
const { withRetry } = require('../utils/retry');

const BASE_URL = 'https://financialmodelingprep.com/api/v3';

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
