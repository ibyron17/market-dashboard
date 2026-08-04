const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { NAVER_CHART_HISTORY_URL, SCRAPE_USER_AGENT, CHART_HISTORY_DAYS, MOVING_AVERAGE_PERIOD } = require('../config/constants');
const { createRateLimiter } = require('../utils/rateLimiter');
const { NAVER_RATE_LIMIT } = require('../config/constants');

const rateLimiter = createRateLimiter(
  NAVER_RATE_LIMIT.maxPerWindow,
  NAVER_RATE_LIMIT.windowMs,
  NAVER_RATE_LIMIT.minGapMs,
);

/**
 * 네이버 일봉 차트 히스토리 XML API 호출.
 * 응답은 EUC-KR 인코딩이지만, 정규식으로 숫자만 추출하므로 인코딩 변환 불필요.
 * @param {string} code - 6자리 종목코드
 * @param {Object} options - {count?: number}
 * @param {Object} deps - 의존성 {rateLimiter?, timeoutMs?}
 * @returns {Promise<string>} XML 응답 (텍스트)
 */
async function fetchNaverChartHistory(code, { count = CHART_HISTORY_DAYS } = {}, { rateLimiter: limiter = rateLimiter, timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    await limiter.acquire();
    const response = await axios.get(NAVER_CHART_HISTORY_URL, {
      params: {
        symbol: code,
        timeframe: 'day',
        count,
        requestType: 0,
      },
      timeout: timeoutMs,
      headers: {
        'User-Agent': SCRAPE_USER_AGENT,
        Referer: 'https://finance.naver.com/',
      },
      responseType: 'text', // EUC-KR XML을 텍스트로 받음. 한글 깨짐 무시.
    });
    return response.data;
  });
}

/**
 * 네이버 차트 XML 응답 파싱.
 * 형식: <item data="날짜|시가|고가|저가|종가|거래량" />
 * 한글 종목명은 EUC-KR 깨짐으로 파싱 불가하지만, 우리는 숫자만 쓰므로 무시한다.
 * @param {string} xmlText - XML 응답 텍스트
 * @returns {Array<Object>} [{date, open, high, low, close, volume}] (오름차순)
 */
function parseNaverChartXml(xmlText) {
  if (!xmlText || typeof xmlText !== 'string') {
    throw new Error('Chart XML text is required');
  }

  // <item data="날짜|시가|고가|저가|종가|거래량" /> 형식 추출
  // 정규식: \d{8}\|\d+\|\d+\|\d+\|\d+\|\d+
  const regex = /(\d{8})\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)/g;
  const candles = [];
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(xmlText)) !== null) {
    candles.push({
      date: match[1], // "20260731"
      open: Number(match[2]),
      high: Number(match[3]),
      low: Number(match[4]),
      close: Number(match[5]),
      volume: Number(match[6]),
    });
  }

  if (candles.length === 0) {
    throw new Error('No candle data found in chart XML');
  }

  // 응답 순서를 신뢰하지 않고 날짜로 명시 정렬한다. 비공개 API라 순서가 바뀌어도
  // 조용히 최신/최과거가 뒤집히면 추세 판정이 정반대로 나오기 때문이다.
  return [...candles].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 종가 배열로부터 N일 이동평균 계산.
 * @param {Array<number>} closes - 종가 배열 (과거→최근 순서)
 * @param {number} period - 이동평균 기간 (기본 200)
 * @returns {number|null} 이동평균값 또는 null (데이터 부족 시)
 */
function calculateMovingAverage(closes, period = MOVING_AVERAGE_PERIOD) {
  if (!Array.isArray(closes) || closes.length < period) {
    return null;
  }

  // 마지막 period개 평균
  const recentCloses = closes.slice(-period);
  const sum = recentCloses.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / period);
}

/**
 * 종가와 이동평균선으로부터 기술적 지표 요약.
 * @param {Array<Object>} candles - [{date, open, high, low, close, volume}] (오름차순)
 * @param {number} period - 이동평균 기간 (기본 200)
 * @returns {Object} {lastClose, movingAverage, deviationPercent, isAbove}
 */
function summarizeTrend(candles, period = MOVING_AVERAGE_PERIOD) {
  if (!Array.isArray(candles) || candles.length === 0) {
    return null;
  }

  const lastCandle = candles[candles.length - 1];
  const closes = candles.map((c) => c.close);
  const movingAverage = calculateMovingAverage(closes, period);

  if (!movingAverage) {
    return {
      lastClose: lastCandle.close,
      movingAverage: null,
      deviationPercent: null,
      isAbove: null,
    };
  }

  const deviation = (lastCandle.close / movingAverage - 1) * 100;
  return {
    lastClose: lastCandle.close,
    movingAverage,
    deviationPercent: Math.round(deviation * 100) / 100, // 소수 2자리
    isAbove: lastCandle.close >= movingAverage,
  };
}

/**
 * 일봉 히스토리 수집 (네트워크 + 파싱).
 * @param {string} code - 6자리 종목코드
 * @param {Object} ticker - 종목 객체 {symbol, label}
 * @param {Object} options - {count?}
 * @param {Object} deps - 의존성 주입
 * @returns {Promise<Object>} result envelope
 */
async function collectNaverChartHistory(code, ticker, options = {}, deps = {}) {
  return withResultEnvelope('naverChartHistory', `Failed to fetch chart history for ${code}`, async () => {
    const xmlText = await fetchNaverChartHistory(code, options, deps);
    const candles = parseNaverChartXml(xmlText);
    const trend = summarizeTrend(candles);

    if (!candles.length) throw new Error('No candles parsed');

    return {
      symbol: ticker.symbol,
      label: ticker.label,
      candles,
      trend,
    };
  });
}

module.exports = {
  fetchNaverChartHistory,
  parseNaverChartXml,
  calculateMovingAverage,
  summarizeTrend,
  collectNaverChartHistory,
};
