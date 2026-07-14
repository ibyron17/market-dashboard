const { fetchFmp } = require('./fmpClient');
const { fetchTickerQuote } = require('./fmpTickerQuote');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { WATCHLIST_THEMES } = require('../config/constants');

const SOURCE = 'fmp-watchlist';

async function collectWatchlist(config, deps = { fetchFmp }) {
  return withResultEnvelope(SOURCE, 'Watchlist collection failed', async () => {
    const themes = await Promise.all(
      WATCHLIST_THEMES.map(async (theme) => {
        const companies = await Promise.all(
          theme.tickers.map((ticker) => fetchTickerQuote(ticker, config, deps)),
        );
        return { key: theme.key, label: theme.label, companies };
      }),
    );

    return { themes };
  });
}

module.exports = { collectWatchlist };
