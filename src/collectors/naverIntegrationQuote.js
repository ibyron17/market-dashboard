const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { NAVER_INTEGRATION_QUOTE_URL, SCRAPE_USER_AGENT, NAVER_RATE_LIMIT } = require('../config/constants');
const { createRateLimiter } = require('../utils/rateLimiter');

const rateLimiter = createRateLimiter(
  NAVER_RATE_LIMIT.maxPerWindow,
  NAVER_RATE_LIMIT.windowMs,
  NAVER_RATE_LIMIT.minGapMs,
);

/**
 * 네이버 종목 통합정보 API 호출.
 * @param {string} code - 6자리 종목코드 (예: "005930")
 * @param {Object} deps - 의존성 {rateLimiter?, timeoutMs?}
 * @returns {Promise<Object>} API 응답 JSON
 */
async function fetchNaverIntegrationQuote(code, { rateLimiter: limiter = rateLimiter, timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    await limiter.acquire();
    const response = await axios.get(`${NAVER_INTEGRATION_QUOTE_URL.replace('{code}', code)}`, {
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
 * 숫자 필드에서 콤마/백분율 기호 제거 후 number로 변환. 실패하면 null.
 * @param {string|number} value - 콤마 또는 백분율 포함 문자열
 * @param {boolean} removePercent - 백분율 기호 제거 여부
 * @returns {number|null}
 */
function toNumberOrNull(value, removePercent = false) {
  if (value == null || value === '') return null;
  let str = String(value).replace(/,/g, '');
  if (removePercent) str = str.replace(/%$/, '');
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

/**
 * 문자열 값에서 단위("배", "%") 접미사 제거 후 number로 변환.
 * @param {string} valueStr - 예: "21.22배", "46.53%", "380,000"
 * @returns {number|null}
 */
function parseNumericValue(valueStr) {
  if (!valueStr || valueStr === '') return null;
  // 접미사("배", "%") 제거
  let str = String(valueStr).replace(/[배%]$/, '').replace(/,/g, '');
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

/**
 * 네이버 종목 통합정보 API 응답 파싱.
 * @param {Object} body - API 응답 JSON
 * @param {Object} ticker - 종목 객체 {symbol, label}
 * @returns {Object} 통합정보 객체
 */
function parseNaverIntegrationQuote(body, ticker) {
  if (!body) return null;

  // totalInfos[] 배열에서 code로 값 찾기
  const findTotalInfo = (code) => {
    if (!Array.isArray(body.totalInfos)) return null;
    const item = body.totalInfos.find((info) => info.code === code);
    return item ? item.value : null;
  };

  // 지표 추출
  const per = parseNumericValue(findTotalInfo('per'));
  const eps = parseNumericValue(findTotalInfo('eps'));
  const estimatedPer = parseNumericValue(findTotalInfo('cnsPer'));
  const estimatedEps = parseNumericValue(findTotalInfo('cnsEps'));
  const foreignOwnershipRate = parseNumericValue(findTotalInfo('foreignRate'));
  const high52Weeks = parseNumericValue(findTotalInfo('highPriceOf52Weeks'));
  const low52Weeks = parseNumericValue(findTotalInfo('lowPriceOf52Weeks'));

  // 시가총액/누적거래대금은 단위 문자("조 억", "억")가 붙어있으므로 표시용 그대로 둠
  const marketValueText = findTotalInfo('marketValue') || null;
  const accumulatedTradingValueText = findTotalInfo('accumulatedTradingValue') || null;

  // dealTrendInfos[] 최신 1건 (내림차순이므로 첫 번째)
  let investorFlow = null;
  if (Array.isArray(body.dealTrendInfos) && body.dealTrendInfos.length > 0) {
    const trend = body.dealTrendInfos[0];
    const foreignQuant = toNumberOrNull(trend.foreignerPureBuyQuant);
    const institutionQuant = toNumberOrNull(trend.organPureBuyQuant);
    const individualQuant = toNumberOrNull(trend.individualPureBuyQuant);

    if (foreignQuant != null || institutionQuant != null || individualQuant != null) {
      investorFlow = {
        date: trend.bizdate || null,
        foreign: foreignQuant,
        institution: institutionQuant,
        individual: individualQuant,
      };
    }
  }

  // consensusInfo
  let consensus = null;
  if (body.consensusInfo) {
    const opinionMean = toNumberOrNull(body.consensusInfo.recommMean);
    const priceTargetMean = toNumberOrNull(body.consensusInfo.priceTargetMean);
    if (opinionMean != null || priceTargetMean != null) {
      consensus = {
        date: body.consensusInfo.createDate || null,
        opinionMean,
        priceTargetMean,
      };
    }
  }

  // researches[] 최근 3건만
  const researchReports = [];
  if (Array.isArray(body.researches)) {
    for (let i = 0; i < Math.min(3, body.researches.length); i += 1) {
      const report = body.researches[i];
      if (report.bnm && report.tit) {
        researchReports.push({
          brokerName: report.bnm,
          title: report.tit,
          date: report.wdt || null,
        });
      }
    }
  }

  return {
    symbol: ticker.symbol,
    label: ticker.label,
    per,
    eps,
    estimatedPer,
    estimatedEps,
    foreignOwnershipRate,
    high52Weeks,
    low52Weeks,
    marketValueText,
    accumulatedTradingValueText,
    investorFlow,
    consensus,
    researchReports,
  };
}

/**
 * 종목 통합정보 수집 (네트워크 + 파싱).
 * @param {string} code - 6자리 종목코드
 * @param {Object} ticker - 종목 객체 {symbol, label}
 * @param {Object} deps - 의존성 주입
 * @returns {Promise<Object>} result envelope
 */
async function collectNaverIntegrationQuote(code, ticker, deps = {}) {
  return withResultEnvelope('naverIntegrationQuote', `Failed to fetch integration info for ${code}`, async () => {
    const body = await fetchNaverIntegrationQuote(code, deps);
    const data = parseNaverIntegrationQuote(body, ticker);
    if (!data) throw new Error('Failed to parse integration quote');
    return data;
  });
}

module.exports = {
  fetchNaverIntegrationQuote,
  parseNaverIntegrationQuote,
  collectNaverIntegrationQuote,
  toNumberOrNull,
  parseNumericValue,
};
