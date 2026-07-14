const { withBrowser, createPage } = require('../scrapers/browserFactory');
const { scrapeKrMarket } = require('../scrapers/naverMarketScraper');
const { scrapeForeignFlow } = require('../scrapers/foreignFlowScraper');
const { collectUsMarket } = require('../collectors/usMarketCollector');
const { collectTreasuryYield } = require('../collectors/treasuryCollector');
const { generateInsight } = require('../analysis/claudeInsightGenerator');
const { formatReport } = require('../formatters/reportFormatter');
const { sendTelegramMessage } = require('../notifiers/telegramNotifier');
const { loadConfig } = require('../config/env');
const { logger } = require('../utils/logger');

async function collectKrData() {
  return withBrowser(async (browser) => {
    const [krPage, foreignFlowPage] = await Promise.all([
      createPage(browser),
      createPage(browser),
    ]);

    const [krMarket, foreignFlow] = await Promise.all([
      scrapeKrMarket(krPage),
      scrapeForeignFlow(foreignFlowPage),
    ]);

    return { krMarket, foreignFlow };
  });
}

async function runDailyReport(config = loadConfig(), deps = {}) {
  const {
    collectUsMarketFn = collectUsMarket,
    collectTreasuryYieldFn = collectTreasuryYield,
    collectKrDataFn = collectKrData,
    generateInsightFn = generateInsight,
    formatReportFn = formatReport,
    sendTelegramMessageFn = sendTelegramMessage,
  } = deps;

  try {
    const [usMarket, treasury, krData] = await Promise.all([
      collectUsMarketFn(config),
      collectTreasuryYieldFn(config),
      collectKrDataFn(),
    ]);

    const sections = {
      usMarket,
      treasury,
      krMarket: krData.krMarket,
      foreignFlow: krData.foreignFlow,
    };

    const insight = await generateInsightFn(sections, config);
    const report = formatReportFn({ ...sections, insight });

    await sendTelegramMessageFn(report, config);
    logger.info('Daily report sent successfully');
  } catch (err) {
    logger.error('Daily report pipeline failed', { error: err.message });
    throw err;
  }
}

module.exports = { runDailyReport };
