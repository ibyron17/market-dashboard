const test = require('node:test');
const assert = require('node:assert/strict');
const { runDailyReport } = require('../../../src/pipeline/runDailyReport');

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
    generateInsightFn: async () => ({ status: 'ok', source: 'claude', data: { text: 'insight' } }),
    formatDashboardHtmlFn: () => '<html>dashboard</html>',
    formatDashboardLinkMessageFn: () => 'dashboard link message',
    writeDashboardFileFn: async () => {},
    sendTelegramMessageFn: async () => {},
    resolveDashboardUrlFn: () => 'https://example.github.io/market-dashboard/',
    ...overrides,
  };
}

test('completes and publishes the dashboard even when some collectors fail', async () => {
  let writtenHtml = null;
  let sentMessage = null;

  const deps = buildDeps({
    writeDashboardFileFn: async (html) => {
      writtenHtml = html;
    },
    sendTelegramMessageFn: async (text) => {
      sentMessage = text;
    },
  });

  await runDailyReport(config, deps);

  assert.equal(writtenHtml, '<html>dashboard</html>');
  assert.equal(sentMessage, 'dashboard link message');
});

test('propagates the error when writing the dashboard file fails', async () => {
  const deps = buildDeps({
    writeDashboardFileFn: async () => {
      throw new Error('disk full');
    },
  });

  await assert.rejects(() => runDailyReport(config, deps), /disk full/);
});

test('propagates the error when telegram sending itself fails', async () => {
  const deps = buildDeps({
    sendTelegramMessageFn: async () => {
      throw new Error('telegram unreachable');
    },
  });

  await assert.rejects(() => runDailyReport(config, deps), /telegram unreachable/);
});
