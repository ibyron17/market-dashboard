const test = require('node:test');
const assert = require('node:assert/strict');
const { generateDashboard } = require('../../../src/pipeline/generateDashboard');

const config = {
  telegramBotToken: 'token',
  telegramChatId: 'chat',
  anthropicApiKey: 'key',
  alphaVantageApiKey: 'key',
  fmpApiKey: 'key',
};

function buildDeps(overrides = {}) {
  return {
    collectUsMarketFn: async () => ({ status: 'ok', source: 'fmp', data: { indices: [] } }),
    collectTreasuryYieldFn: async () => ({ status: 'error', source: 'av', error: 'rate limited' }),
    collectKrDataFn: async () => ({
      krMarket: { status: 'error', source: 'naver', error: 'blocked' },
      foreignFlow: {
        status: 'ok',
        source: 'naver',
        data: { foreignNetBuy: '100', institutionNetBuy: '200' },
      },
    }),
    collectWatchlistFn: async () => ({ status: 'ok', source: 'fmp-watchlist', data: { companies: [] } }),
    generateInsightFn: async () => ({ status: 'ok', source: 'claude', data: { text: 'insight' } }),
    formatDashboardHtmlFn: () => '<html>dashboard</html>',
    formatDashboardLinkMessageFn: () => 'dashboard link message',
    writeDashboardFileFn: async () => {},
    resolveDashboardUrlFn: () => 'https://example.github.io/market-dashboard/',
    ...overrides,
  };
}

test('writes the dashboard html and the pending telegram message, but never sends it', async () => {
  const writes = [];

  const deps = buildDeps({
    writeDashboardFileFn: async (content, filePath) => {
      writes.push({ content, filePath });
    },
  });

  const result = await generateDashboard(config, deps);

  assert.equal(writes.length, 2);
  assert.equal(writes[0].content, '<html>dashboard</html>');
  assert.equal(writes[0].filePath, 'dist/index.html');
  assert.equal(writes[1].content, 'dashboard link message');
  assert.equal(writes[1].filePath, 'artifacts/telegram-message.txt');
  assert.equal(result.dashboardUrl, 'https://example.github.io/market-dashboard/');
  assert.equal(result.message, 'dashboard link message');
});

test('propagates the error when writing the dashboard file fails', async () => {
  const deps = buildDeps({
    writeDashboardFileFn: async () => {
      throw new Error('disk full');
    },
  });

  await assert.rejects(() => generateDashboard(config, deps), /disk full/);
});
