const { fetchFmp } = require('./fmpClient');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { FED_FUNDS_HISTORY_LIMIT } = require('../config/constants');

const SOURCE = 'fmp-fed-funds-rate';

async function collectFedFundsRate(config, deps = { fetchFmp }) {
  return withResultEnvelope(SOURCE, 'Fed funds rate collection failed', async () => {
    const body = await deps.fetchFmp(
      '/economic-indicators',
      { name: 'federalFunds' },
      { apiKey: config.fmpApiKey },
    );

    const entries = Array.isArray(body) ? body : [];
    const latest = entries.length > 0 ? entries[0] : null;

    // FMP returns most-recent-first; the mini trend chart needs chronological order.
    const history = entries
      .slice(0, FED_FUNDS_HISTORY_LIMIT)
      .map((entry) => ({ date: entry.date, value: entry.value }))
      .reverse();

    return {
      rate: latest ? latest.value : null,
      date: latest ? latest.date : null,
      history,
    };
  });
}

module.exports = { collectFedFundsRate };
