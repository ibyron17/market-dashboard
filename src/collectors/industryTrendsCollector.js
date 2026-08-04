const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { NAVER_INDUSTRY_TRENDS_URL, SCRAPE_USER_AGENT, NAVER_RATE_LIMIT } = require('../config/constants');
const { createRateLimiter } = require('../utils/rateLimiter');

const rateLimiter = createRateLimiter(
  NAVER_RATE_LIMIT.maxPerWindow,
  NAVER_RATE_LIMIT.windowMs,
  NAVER_RATE_LIMIT.minGapMs,
);

/**
 * 네이버 업종별 등락 API 호출.
 * @param {Object} deps - 의존성 {rateLimiter?, timeoutMs?}
 * @returns {Promise<Object>} API 응답 JSON
 */
async function fetchIndustryTrends({ rateLimiter: limiter = rateLimiter, timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    await limiter.acquire();
    const response = await axios.get(NAVER_INDUSTRY_TRENDS_URL, {
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
 * @param {string|number} value
 * @returns {number|null}
 */
function toNumberOrNull(value) {
  if (value == null || value === '') return null;
  const num = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}

/**
 * 네이버 업종별 등락 API 응답 파싱.
 * @param {Object} body - API 응답 JSON
 * @returns {Object} {industries: [...], topRising: [...], topFalling: [...]}
 */
function parseIndustryTrends(body) {
  if (!body || !Array.isArray(body.groups)) {
    throw new Error('Invalid industry trends response');
  }

  const industries = body.groups
    .map((group) => ({
      name: group.name,
      totalCount: group.totalCount || 0,
      changeRate: toNumberOrNull(group.changeRate),
      riseCount: group.riseCount || 0,
      fallCount: group.fallCount || 0,
      steadyCount: group.steadyCount || 0,
    }))
    .filter((ind) => ind.changeRate != null); // 등락률이 없으면 제외

  // 등락률 기준으로 정렬 (내림차순)
  const sorted = [...industries].sort((a, b) => (b.changeRate || 0) - (a.changeRate || 0));

  return {
    industries,
    topRising: sorted.slice(0, 5),
    topFalling: sorted.slice(-3).reverse(), // 하위 3개를 역순으로
  };
}

/**
 * 업종별 등락 수집 (네트워크 + 파싱).
 * @param {Object} deps - 의존성 주입
 * @returns {Promise<Object>} result envelope
 */
async function collectIndustryTrends(deps = {}) {
  return withResultEnvelope('industryTrends', 'Failed to fetch industry trends', async () => {
    const body = await fetchIndustryTrends(deps);
    const data = parseIndustryTrends(body);
    return data;
  });
}

module.exports = {
  fetchIndustryTrends,
  parseIndustryTrends,
  collectIndustryTrends,
  toNumberOrNull,
};
