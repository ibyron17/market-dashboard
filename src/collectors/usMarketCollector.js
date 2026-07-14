const { fetchFmp } = require('./fmpClient');
const { fetchTickerQuote } = require('./fmpTickerQuote');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { US_INDEX_TICKERS } = require('../config/constants');

const SOURCE = 'fmp-us-market';

async function collectUsMarket(config, deps = { fetchFmp }) {
  return withResultEnvelope(SOURCE, 'US market collection failed', async () => {
    const indices = await Promise.all(
      US_INDEX_TICKERS.map((ticker) => fetchTickerQuote(ticker, config, deps)),
    );

    return { indices };
  });
}

module.exports = { collectUsMarket };
