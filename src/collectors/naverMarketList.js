const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { NAVER_MARKET_LIST_URL, SCRAPE_USER_AGENT, NAVER_RATE_LIMIT } = require('../config/constants');
const { createRateLimiter } = require('../utils/rateLimiter');
const { applyDirectionSign } = require('./naverPriceSign');

const rateLimiter = createRateLimiter(
  NAVER_RATE_LIMIT.maxPerWindow,
  NAVER_RATE_LIMIT.windowMs,
  NAVER_RATE_LIMIT.minGapMs,
);

/**
 * 네이버 시장 대량 조회 API 호출 (KOSPI/KOSDAQ).
 * @param {string} market - "KOSPI" | "KOSDAQ"
 * @param {Object} options - {page?: number, pageSize?: number}
 * @param {Object} deps - 의존성 {rateLimiter?, timeoutMs?}
 * @returns {Promise<Object>} API 응답 JSON
 */
async function fetchNaverMarketList(market, { page = 1, pageSize = 100 } = {}, { rateLimiter: limiter = rateLimiter, timeoutMs = 10000 } = {}) {
  if (!['KOSPI', 'KOSDAQ'].includes(market)) {
    throw new Error(`Invalid market: ${market}`);
  }

  return withRetry(async () => {
    await limiter.acquire();
    const url = NAVER_MARKET_LIST_URL.replace('{market}', market);
    const response = await axios.get(url, {
      params: {
        page,
        pageSize,
      },
      timeout: timeoutMs,
      headers: {
        'User-Agent': SCRAPE_USER_AGENT,
        Referer: 'https://finance.naver.com/',
      },
    });
    return response.data;
  });
}

/**
 * 숫자 변환 헬퍼 (콤마 제거).
 * @param {string|number} value - 콤마 포함 값
 * @returns {number|null}
 */
function toNumberOrNull(value) {
  if (value == null || value === '') return null;
  const num = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}

/**
 * 네이버 시장 대량 조회 API 응답 파싱.
 * @param {Object} body - API 응답 JSON
 * @param {string} market - "KOSPI" | "KOSDAQ"
 * @returns {Object} {market, stocks: [...]}
 */
function parseNaverMarketList(body, market) {
  if (!body || !Array.isArray(body.stocks)) {
    throw new Error(`Invalid market list response for ${market}`);
  }

  const stocks = body.stocks.map((stock) => {
    // 등락률은 부호 없음. 방향은 compareToPreviousPrice.name에만 있음.
    const changesPercentage = applyDirectionSign(
      stock.fluctuationsRatio,
      stock.compareToPreviousPrice ? stock.compareToPreviousPrice.name : null,
    );

    return {
      symbol: stock.itemCode,
      name: stock.stockName,
      price: toNumberOrNull(stock.closePrice),
      changesPercentage,
      marketValueText: stock.marketValueHangeul || null,
      tradingValueText: stock.accumulatedTradingValue || null,
    };
  });

  return {
    market,
    stocks,
  };
}

/**
 * 시장 대량 조회 수집 (네트워크 + 파싱).
 * @param {string} market - "KOSPI" | "KOSDAQ"
 * @param {Object} options - {page?, pageSize?}
 * @param {Object} deps - 의존성 주입
 * @returns {Promise<Object>} result envelope
 */
async function collectNaverMarketList(market, options = {}, deps = {}) {
  return withResultEnvelope('naverMarketList', `Failed to fetch market list for ${market}`, async () => {
    const body = await fetchNaverMarketList(market, options, deps);
    const data = parseNaverMarketList(body, market);
    return data;
  });
}

module.exports = {
  fetchNaverMarketList,
  parseNaverMarketList,
  collectNaverMarketList,
  toNumberOrNull,
};
