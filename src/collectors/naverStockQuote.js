const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { applyDirectionSign } = require('./naverPriceSign');
const { NAVER_STOCK_QUOTE_URL, SCRAPE_USER_AGENT } = require('../config/constants');

// 네이버 시세 API 원본 호출. API 키가 필요 없고 종목 수 제한도 없다.
async function fetchNaverStockQuote(code, { timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${NAVER_STOCK_QUOTE_URL}/${code}`, {
      timeout: timeoutMs,
      headers: { 'User-Agent': SCRAPE_USER_AGENT },
    });
    return response.data;
  });
}

/**
 * 네이버 시세 API 응답을 파싱해 종목 정보 반환.
 * @param {Object} body - API 응답 JSON
 * @param {Object} ticker - 종목 객체 {symbol, label, market}
 * @returns {Object} {label, symbol, price, changesPercentage, currency}
 */
function parseNaverStockQuote(body, ticker) {
  const data = Array.isArray(body?.datas) && body.datas.length > 0 ? body.datas[0] : null;

  let changesPercentage = null;
  if (data && data.fluctuationsRatio != null) {
    const direction = data.compareToPreviousPrice ? data.compareToPreviousPrice.name : null;
    changesPercentage = applyDirectionSign(data.fluctuationsRatio, direction);
  }

  return {
    label: ticker.label,
    symbol: ticker.symbol,
    // "279,500" 같은 콤마 포함 문자열을 그대로 표시용으로 쓴다.
    price: data && data.closePrice ? data.closePrice : null,
    changesPercentage,
    currency: 'KRW',
  };
}

async function fetchKrTickerQuote(ticker, deps) {
  const body = await deps.fetchNaverStockQuote(ticker.symbol);
  return parseNaverStockQuote(body, ticker);
}

module.exports = { fetchNaverStockQuote, fetchKrTickerQuote, parseNaverStockQuote };
