const { fetchAlphaVantage } = require('./alphaVantageClient');
const { withResultEnvelope } = require('../utils/resultEnvelope');

const SOURCE = 'alpha-vantage-treasury-yield';

async function collectTreasuryYield(config, deps = { fetchAlphaVantage }) {
  return withResultEnvelope(SOURCE, 'Treasury yield collection failed', async () => {
    const body = await deps.fetchAlphaVantage(
      { function: 'TREASURY_YIELD', interval: 'daily', maturity: '10year' },
      { apiKey: config.alphaVantageApiKey },
    );

    const latest = Array.isArray(body?.data) && body.data.length > 0 ? body.data[0] : null;

    return { date: latest?.date ?? null, yieldPercent: latest?.value ?? null };
  });
}

module.exports = { collectTreasuryYield };
