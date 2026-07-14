const { fetchFmp } = require('./fmpClient');
const { fetchTickerQuote } = require('./fmpTickerQuote');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { WATCHLIST_TICKERS } = require('../config/constants');

const SOURCE = 'fmp-watchlist';

async function collectWatchlist(config, deps = { fetchFmp }) {
  return withResultEnvelope(SOURCE, 'Watchlist collection failed', async () => {
    const companies = await Promise.all(
      WATCHLIST_TICKERS.map((ticker) => fetchTickerQuote(ticker, config, deps)),
    );

    return { companies };
  });
}

module.exports = { collectWatchlist };
