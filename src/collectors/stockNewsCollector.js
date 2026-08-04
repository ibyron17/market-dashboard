const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { decodeHtmlEntities } = require('../utils/htmlEscape');
const { NAVER_STOCK_NEWS_URL, SCRAPE_USER_AGENT, NAVER_RATE_LIMIT } = require('../config/constants');
const { createRateLimiter } = require('../utils/rateLimiter');

const rateLimiter = createRateLimiter(
  NAVER_RATE_LIMIT.maxPerWindow,
  NAVER_RATE_LIMIT.windowMs,
  NAVER_RATE_LIMIT.minGapMs,
);

/**
 * 네이버 종목 뉴스 API 호출.
 * @param {string} code - 6자리 종목코드
 * @param {Object} options - {pageSize?: number, page?: number}
 * @param {Object} deps - 의존성 {rateLimiter?, timeoutMs?}
 * @returns {Promise<Array>} API 응답 (뉴스 그룹 배열)
 */
async function fetchStockNews(code, { pageSize = 20, page = 1 } = {}, { rateLimiter: limiter = rateLimiter, timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    await limiter.acquire();
    const url = NAVER_STOCK_NEWS_URL.replace('{code}', code);
    const response = await axios.get(url, {
      params: {
        pageSize,
        page,
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
 * datetime 문자열 파싱 ("202608041327" → {date: "2026-08-04", time: "13:27"}).
 * @param {string} datetimeStr - YYYYMMDDHHmm 형식
 * @returns {Object|null} {date, time} 또는 null
 */
function parseDatetime(datetimeStr) {
  if (!datetimeStr || datetimeStr.length < 12) return null;

  const year = datetimeStr.slice(0, 4);
  const month = datetimeStr.slice(4, 6);
  const day = datetimeStr.slice(6, 8);
  const hour = datetimeStr.slice(8, 10);
  const minute = datetimeStr.slice(10, 12);

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

/**
 * 네이버 뉴스 API 응답 파싱.
 * 응답은 배열의 배열: [{items: [...]}, ...].
 * 각 그룹의 items를 평탄화해서 최신순 N건 반환.
 * @param {Array|Object} body - API 응답 (배열 또는 배열 배열)
 * @param {string} code - 종목코드
 * @param {number} limit - 반환 개수 (기본 5)
 * @returns {Object} {symbol, articles: [...]}
 */
function parseStockNews(body, code, limit = 5) {
  const articles = [];

  // body가 배열인지 확인하고, 각 그룹의 items 추출
  if (Array.isArray(body)) {
    for (const group of body) {
      if (group && Array.isArray(group.items)) {
        for (const item of group.items) {
          // titleFull 우선, 없으면 title
          const title = decodeHtmlEntities(item.titleFull || item.title || '');
          const publishedAt = parseDatetime(item.datetime);

          if (title && publishedAt) {
            articles.push({
              officeName: item.officeName || 'Unknown',
              title,
              publishedAt,
              url: item.mobileNewsUrl || null,
            });
          }

          if (articles.length >= limit) break;
        }
        if (articles.length >= limit) break;
      }
    }
  }

  return {
    symbol: code,
    articles: articles.slice(0, limit),
  };
}

/**
 * 종목 뉴스 수집 (네트워크 + 파싱).
 * @param {string} code - 6자리 종목코드
 * @param {Object} options - {pageSize?, page?, limit?}
 * @param {Object} deps - 의존성 주입
 * @returns {Promise<Object>} result envelope
 */
async function collectStockNews(code, { limit = 5, pageSize = 20, page = 1 } = {}, deps = {}) {
  return withResultEnvelope('naverStockNews', `Failed to fetch news for ${code}`, async () => {
    const body = await fetchStockNews(code, { pageSize, page }, deps);
    const data = parseStockNews(body, code, limit);
    return data;
  });
}

module.exports = {
  fetchStockNews,
  parseStockNews,
  parseDatetime,
  collectStockNews,
};
