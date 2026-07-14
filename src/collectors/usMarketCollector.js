const { fetchFmp } = require('./fmpClient');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { US_INDEX_TICKERS } = require('../config/constants');

const SOURCE = 'fmp-us-market';

async function fetchIndexQuote(ticker, config, deps) {
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

async function collectUsMarket(config, deps = { fetchFmp }) {
  return withResultEnvelope(SOURCE, 'US market collection failed', async () => {
    const indices = await Promise.all(
      US_INDEX_TICKERS.map((ticker) => fetchIndexQuote(ticker, config, deps)),
    );

    return { indices };
  });
}

module.exports = { collectUsMarket };
