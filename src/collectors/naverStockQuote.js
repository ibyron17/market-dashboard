const axios = require('axios');
const { withRetry } = require('../utils/retry');
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

// fluctuationsRatio("6.27")에는 부호가 없고 방향은 compareToPreviousPrice.name
// (RISING/FALLING/EVEN/UPPER_LIMIT/LOWER_LIMIT)으로만 온다. 방향에서 부호를 정한다.
function parseNaverStockQuote(body, ticker) {
  const data = Array.isArray(body?.datas) && body.datas.length > 0 ? body.datas[0] : null;

  let changesPercentage = null;
  if (data && data.fluctuationsRatio != null && String(data.fluctuationsRatio).trim() !== '') {
    const ratio = Number(String(data.fluctuationsRatio).replace(/,/g, ''));
    if (Number.isFinite(ratio)) {
      const direction = data.compareToPreviousPrice ? data.compareToPreviousPrice.name : '';
      const magnitude = Math.abs(ratio);
      changesPercentage =
        direction === 'FALLING' || direction === 'LOWER_LIMIT' ? -magnitude : magnitude;
      if (direction === 'EVEN') changesPercentage = 0;
    }
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
