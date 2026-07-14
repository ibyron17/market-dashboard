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

test('completes and sends a report even when some collectors fail', async () => {
  let sentReport = null;

  const deps = {
    collectUsMarketFn: async () => ({ status: 'ok', source: 'fmp', data: { indices: [] } }),
    collectTreasuryYieldFn: async () => ({ status: 'error', source: 'av', error: 'rate limited' }),
    collectKrDataFn: async () => ({
      krMarket: { status: 'error', source: 'naver', error: 'blocked' },
      foreignFlow: { status: 'ok', source: 'naver', data: { foreignNetBuy: '100', institutionNetBuy: '200' } },
    }),
    generateInsightFn: async () => ({ status: 'ok', source: 'claude', data: { text: 'insight' } }),
    formatReportFn: (sections) => {
      sentReport = sections;
      return 'formatted report text';
    },
    sendTelegramMessageFn: async (text) => {
      assert.equal(text, 'formatted report text');
    },
  };

  await runDailyReport(config, deps);

  assert.equal(sentReport.usMarket.status, 'ok');
  assert.equal(sentReport.treasury.status, 'error');
  assert.equal(sentReport.krMarket.status, 'error');
  assert.equal(sentReport.foreignFlow.status, 'ok');
});

test('propagates the error when telegram sending itself fails', async () => {
  const deps = {
    collectUsMarketFn: async () => ({ status: 'error', error: 'down' }),
    collectTreasuryYieldFn: async () => ({ status: 'error', error: 'down' }),
    collectKrDataFn: async () => ({
      krMarket: { status: 'error', error: 'down' },
      foreignFlow: { status: 'error', error: 'down' },
    }),
    generateInsightFn: async () => ({ status: 'error', error: 'skipped' }),
    formatReportFn: () => 'report text',
    sendTelegramMessageFn: async () => {
      throw new Error('telegram unreachable');
    },
  };

  await assert.rejects(() => runDailyReport(config, deps), /telegram unreachable/);
});
