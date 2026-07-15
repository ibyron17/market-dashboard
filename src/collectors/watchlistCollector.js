const { fetchAlphaVantage } = require('./alphaVantageClient');
const { fetchAvTickerQuote } = require('./avTickerQuote');
const { fetchNaverStockQuote, fetchKrTickerQuote } = require('./naverStockQuote');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { WATCHLIST_THEMES } = require('../config/constants');

const SOURCE = 'watchlist';

// market: 'kr' → 네이버 시세 API(무료·무제한), 'us' → Alpha Vantage GLOBAL_QUOTE.
async function fetchCompanyQuote(ticker, config, deps) {
  if (ticker.market === 'kr') {
    return fetchKrTickerQuote(ticker, deps);
  }
  const quote = await fetchAvTickerQuote(ticker, config, deps);
  return { ...quote, currency: 'USD' };
}

// Alpha Vantage 무료 키는 분당 호출 제한이 빡빡해서(공용 리미터 5회/분) 심볼을
// 순차 조회한다. 한 종목이 실패해도 카드 전체가 죽지 않도록 실패한 종목만
// null 값(→ 화면에는 "데이터 없음")으로 대체한다.
async function collectWatchlist(config, deps = { fetchAlphaVantage, fetchNaverStockQuote }) {
  return withResultEnvelope(SOURCE, 'Watchlist collection failed', async () => {
    const themes = [];

    for (const theme of WATCHLIST_THEMES) {
      const companies = [];
      for (const ticker of theme.tickers) {
        try {
          // eslint-disable-next-line no-await-in-loop
          companies.push(await fetchCompanyQuote(ticker, config, deps));
        } catch (err) {
          companies.push({
            label: ticker.label,
            symbol: ticker.symbol,
            price: null,
            changesPercentage: null,
            currency: ticker.market === 'kr' ? 'KRW' : 'USD',
          });
        }
      }
      themes.push({ key: theme.key, label: theme.label, companies });
    }

    return { themes };
  });
}

module.exports = { collectWatchlist };
