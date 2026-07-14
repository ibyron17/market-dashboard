const { fetchFmp } = require('./fmpClient');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { US_INDEX_TICKERS } = require('../config/constants');

const SOURCE = 'fmp-us-market';

async function collectUsMarket(config, deps = { fetchFmp }) {
  return withResultEnvelope(SOURCE, 'US market collection failed', async () => {
    const symbols = US_INDEX_TICKERS.map((ticker) => ticker.symbol).join(',');
    const quotes = await deps.fetchFmp(`/quote/${symbols}`, {}, { apiKey: config.fmpApiKey });

    const indices = US_INDEX_TICKERS.map((ticker) => {
      const quote = (quotes || []).find((q) => q.symbol === ticker.symbol);
      return {
        label: ticker.label,
        symbol: ticker.symbol,
        price: quote ? quote.price : null,
        changesPercentage: quote ? quote.changesPercentage : null,
      };
    });

    return { indices };
  });
}

module.exports = { collectUsMarket };
