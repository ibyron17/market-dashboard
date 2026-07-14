const { withBrowser, createPage } = require('../scrapers/browserFactory');
const { scrapeKrMarket } = require('../scrapers/naverMarketScraper');
const { scrapeForeignFlow } = require('../scrapers/foreignFlowScraper');
const { collectUsMarket } = require('../collectors/usMarketCollector');
const { collectTreasuryYield } = require('../collectors/treasuryCollector');
const { generateInsight } = require('../analysis/claudeInsightGenerator');
const { formatDashboardHtml } = require('../formatters/dashboardFormatter');
const { formatDashboardLinkMessage } = require('../formatters/telegramLinkFormatter');
const { writeDashboardFile } = require('../notifiers/dashboardFileWriter');
const { sendTelegramMessage } = require('../notifiers/telegramNotifier');
const { loadConfig } = require('../config/env');
const { logger } = require('../utils/logger');
const { resolveDashboardUrl } = require('../utils/dashboardUrl');
const { DASHBOARD_OUTPUT_PATH } = require('../config/constants');

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
    formatDashboardHtmlFn = formatDashboardHtml,
    formatDashboardLinkMessageFn = formatDashboardLinkMessage,
    writeDashboardFileFn = writeDashboardFile,
    sendTelegramMessageFn = sendTelegramMessage,
    resolveDashboardUrlFn = resolveDashboardUrl,
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
    const allSections = { ...sections, insight };

    const html = formatDashboardHtmlFn(allSections);
    await writeDashboardFileFn(html, DASHBOARD_OUTPUT_PATH);

    const dashboardUrl = resolveDashboardUrlFn();
    const message = formatDashboardLinkMessageFn(allSections, dashboardUrl);
    await sendTelegramMessageFn(message, config);

    logger.info('Daily dashboard published and Telegram link sent', { dashboardUrl });
  } catch (err) {
    logger.error('Daily report pipeline failed', { error: err.message });
    throw err;
  }
}

module.exports = { runDailyReport };
