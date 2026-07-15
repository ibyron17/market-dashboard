// FMP 무료 티어는 인기 종목 일부(NVDA, TSLA 등)만 /quote 를 허용하고 나머지 심볼은
// 402(프리미엄 전용)를 돌려준다. 관심 기업 시세는 종목 제한이 없는 Alpha Vantage
// GLOBAL_QUOTE 로 조회한다. (호출량은 alphaVantageClient 의 공용 리미터가 조절한다.)
// Number('') === 0 이라서 빈 문자열을 그대로 Number 에 넣으면 0으로 오인된다.
function toNumberOrNull(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const numeric = Number(String(raw).replace(/%$/, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

async function fetchAvTickerQuote(ticker, config, deps) {
  const body = await deps.fetchAlphaVantage(
    { function: 'GLOBAL_QUOTE', symbol: ticker.symbol },
    { apiKey: config.alphaVantageApiKey },
  );

  const quote = body ? body['Global Quote'] : null;

  return {
    label: ticker.label,
    symbol: ticker.symbol,
    price: quote ? toNumberOrNull(quote['05. price']) : null,
    changesPercentage: quote ? toNumberOrNull(quote['10. change percent']) : null,
  };
}

module.exports = { fetchAvTickerQuote };
