// usMarketCollector.js와 watchlistCollector.js가 공유하는 개별 심볼 조회 로직.
// FMP 무료 티어는 콤마 구분 배치 조회를 프리미엄으로 막아두므로, 반드시 심볼 하나당
// 호출 하나씩 개별 요청하는 방식을 유지해야 한다 (config/constants.js의 주석 참고).
async function fetchTickerQuote(ticker, config, deps) {
  const quotes = await deps.fetchFmp(
    '/quote',
    { symbol: ticker.symbol },
    { apiKey: config.fmpApiKey },
  );
  const quote = Array.isArray(quotes) ? quotes[0] : null;

  return {
    label: ticker.label,
    symbol: ticker.symbol,
    price: quote ? quote.price : null,
    changesPercentage: quote ? quote.changePercentage : null,
  };
}

module.exports = { fetchTickerQuote };
