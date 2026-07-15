const { fetchAlphaVantage } = require('./alphaVantageClient');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { FED_FUNDS_HISTORY_LIMIT } = require('../config/constants');

const SOURCE = 'alpha-vantage-fed-funds-rate';

// FMP 무료 키의 /economic-indicators 는 수개월 지연된 값을 돌려줘서(2026-07 시점에
// 2025-10 값이 최신으로 옴) FRED 기반인 Alpha Vantage FEDERAL_FUNDS_RATE 를 쓴다.
async function collectFedFundsRate(config, deps = { fetchAlphaVantage }) {
  return withResultEnvelope(SOURCE, 'Fed funds rate collection failed', async () => {
    const body = await deps.fetchAlphaVantage(
      { function: 'FEDERAL_FUNDS_RATE', interval: 'monthly' },
      { apiKey: config.alphaVantageApiKey },
    );

    const entries = Array.isArray(body?.data) ? body.data : [];
    const latest = entries.length > 0 ? entries[0] : null;

    // Alpha Vantage returns most-recent-first; the mini trend chart needs chronological order.
    const history = entries
      .slice(0, FED_FUNDS_HISTORY_LIMIT)
      .map((entry) => ({ date: entry.date, value: Number(entry.value) }))
      .reverse();

    return {
      rate: latest ? Number(latest.value) : null,
      date: latest ? latest.date : null,
      history,
    };
  });
}

module.exports = { collectFedFundsRate };
