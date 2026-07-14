const { fetchFmp } = require('./fmpClient');
const { fetchTickerQuote } = require('./fmpTickerQuote');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { VIX_TICKER } = require('../config/constants');

const SOURCE = 'fmp-vix';

async function collectVix(config, deps = { fetchFmp }) {
  return withResultEnvelope(SOURCE, 'VIX collection failed', async () =>
    fetchTickerQuote(VIX_TICKER, config, deps),
  );
}

module.exports = { collectVix };
