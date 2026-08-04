const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { SEC_BASE_URL, SEC_TICKERS_URL, SEC_USER_AGENT } = require('../config/constants');

// SEC EDGAR에 관심 있는 종목 필터 (10-K, 10-Q, 8-K, 4)
const FILING_FORMS = Object.freeze(['10-K', '10-Q', '8-K', '4']);

/**
 * SEC company_tickers.json 다운로드 (CIK 매핑용).
 * 캐시 없이 매번 호출하지 않기 위해 필요 시 상위에서 캐싱 처리.
 * @param {Object} options - {timeoutMs?}
 * @returns {Promise<Object>} {ticker: {cik_str, ticker, title}, ...}
 */
async function fetchSecTickerMap({ timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(SEC_TICKERS_URL, {
      timeout: timeoutMs,
      headers: { 'User-Agent': SEC_USER_AGENT },
    });
    return response.data;
  });
}

/**
 * CIK(Company ID)로부터 SEC EDGAR 공시 정보 조회.
 * @param {string} cik - 10자리 0패딩 CIK (예: "0000320193")
 * @param {Object} options - {timeoutMs?}
 * @returns {Promise<Object>} filings.recent 컬럼 병렬 배열
 */
async function fetchSecFilings(cik, { timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    const url = `${SEC_BASE_URL}/submissions/CIK${cik}.json`;
    const response = await axios.get(url, {
      timeout: timeoutMs,
      headers: { 'User-Agent': SEC_USER_AGENT },
    });

    if (!response.data || !response.data.filings || !response.data.filings.recent) {
      throw new Error(`No filings found for CIK ${cik}`);
    }

    return response.data.filings.recent;
  });
}

/**
 * ticker 문자열로부터 CIK 조회.
 * @param {Object} tickerMap - company_tickers.json 파싱 결과
 * @param {string} ticker - 티커 (예: "AAPL")
 * @returns {string|null} 10자리 0패딩 CIK 또는 null
 */
function resolveCik(tickerMap, ticker) {
  if (!tickerMap || typeof ticker !== 'string') return null;

  const upperTicker = ticker.toUpperCase();

  // tickerMap은 {index: {cik_str, ticker, title}} 형식
  for (const entry of Object.values(tickerMap)) {
    if (entry && entry.ticker && entry.ticker.toUpperCase() === upperTicker) {
      // cik_str을 10자리 0패딩으로
      const cikNum = Number(entry.cik_str);
      return String(cikNum).padStart(10, '0');
    }
  }

  return null;
}

/**
 * SEC EDGAR 공시 응답 파싱.
 * 컬럼 병렬 배열 형식을 행 형식으로 변환.
 * @param {Object} filings - filings.recent (컬럼 병렬 배열)
 * @param {number} limit - 반환 개수
 * @returns {Array<Object>} [{form, filingDate, description, accessionNumber}]
 */
function parseSecFilings(filings, limit = 5) {
  if (!filings || !Array.isArray(filings.filingDate)) {
    return [];
  }

  const { filingDate, form, primaryDocDescription, accessionNumber } = filings;
  const records = [];

  // 컬럼 배열 길이 확인 (필수 필드만 고려)
  const length = Math.min(
    filingDate.length,
    Array.isArray(form) ? form.length : 0,
  );

  if (length === 0) {
    return [];
  }

  // 행 병렬화: 각 인덱스마다 한 건씩 묶기
  for (let i = 0; i < length && records.length < limit; i += 1) {
    const filing = {
      form: form[i] || null,
      filingDate: filingDate[i] || null,
      description: primaryDocDescription && primaryDocDescription[i] ? primaryDocDescription[i] : null,
      accessionNumber: accessionNumber && accessionNumber[i] ? accessionNumber[i] : null,
    };

    // 관심 폼만 필터
    if (FILING_FORMS.includes(filing.form)) {
      records.push(filing);
    }
  }

  return records.slice(0, limit);
}

/**
 * SEC 공시 수집 (CIK 조회 → 공시 조회 → 파싱).
 * @param {string} ticker - 티커 (예: "AAPL")
 * @param {Object} tickerMap - company_tickers.json 캐시
 * @param {Object} options - {limit?, timeoutMs?}
 * @param {Object} deps - 의존성 주입
 * @returns {Promise<Object>} result envelope
 */
async function collectSecFilings(ticker, tickerMap, { limit = 5, timeoutMs = 10000 } = {}, deps = {}) {
  return withResultEnvelope('secFilings', `Failed to fetch SEC filings for ${ticker}`, async () => {
    const cik = resolveCik(tickerMap, ticker);
    if (!cik) throw new Error(`Ticker ${ticker} not found in SEC database`);

    const filings = await fetchSecFilings(cik, { timeoutMs });
    const records = parseSecFilings(filings, limit);

    if (!records.length) throw new Error(`No relevant filings found for ${ticker}`);

    return {
      symbol: ticker,
      filings: records,
    };
  });
}

module.exports = {
  fetchSecTickerMap,
  fetchSecFilings,
  resolveCik,
  parseSecFilings,
  collectSecFilings,
  FILING_FORMS,
};
