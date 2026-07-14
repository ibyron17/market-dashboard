const { withBrowser, createPage } = require('../scrapers/browserFactory');
const { scrapeKrMarket } = require('../scrapers/naverMarketScraper');
const { scrapeForeignFlow } = require('../scrapers/foreignFlowScraper');
const { collectUsMarket } = require('../collectors/usMarketCollector');
const { collectTreasuryYield } = require('../collectors/treasuryCollector');
const { collectWatchlist } = require('../collectors/watchlistCollector');
const { generateInsight } = require('../analysis/claudeInsightGenerator');
const { formatDashboardHtml } = require('../formatters/dashboardFormatter');
const { formatDashboardLinkMessage } = require('../formatters/telegramLinkFormatter');
const { writeDashboardFile } = require('../notifiers/dashboardFileWriter');
const { loadConfig } = require('../config/env');
const { logger } = require('../utils/logger');
const { resolveDashboardUrl } = require('../utils/dashboardUrl');
const { DASHBOARD_OUTPUT_PATH, TELEGRAM_MESSAGE_OUTPUT_PATH } = require('../config/constants');

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

// Only builds the dashboard HTML and the pending Telegram message — it does NOT
// send the Telegram notification. That happens in a later step/job, after the
// dashboard has actually been deployed (see sendDashboardNotification.js), so
// the link is never sent out before the page it points to is live.
async function generateDashboard(config = loadConfig(), deps = {}) {
  const {
    collectUsMarketFn = collectUsMarket,
    collectTreasuryYieldFn = collectTreasuryYield,
    collectKrDataFn = collectKrData,
    collectWatchlistFn = collectWatchlist,
    generateInsightFn = generateInsight,
    formatDashboardHtmlFn = formatDashboardHtml,
    formatDashboardLinkMessageFn = formatDashboardLinkMessage,
    writeDashboardFileFn = writeDashboardFile,
    resolveDashboardUrlFn = resolveDashboardUrl,
  } = deps;

  try {
    const [usMarket, treasury, krData, watchlist] = await Promise.all([
      collectUsMarketFn(config),
      collectTreasuryYieldFn(config),
      collectKrDataFn(),
      collectWatchlistFn(config),
    ]);

    const sections = {
      usMarket,
      treasury,
      krMarket: krData.krMarket,
      foreignFlow: krData.foreignFlow,
      watchlist,
    };

    const insight = await generateInsightFn(sections, config);
    const allSections = { ...sections, insight };

    const html = formatDashboardHtmlFn(allSections);
    await writeDashboardFileFn(html, DASHBOARD_OUTPUT_PATH);

    const dashboardUrl = resolveDashboardUrlFn();
    const message = formatDashboardLinkMessageFn(allSections, dashboardUrl);
    await writeDashboardFileFn(message, TELEGRAM_MESSAGE_OUTPUT_PATH);

    logger.info('Dashboard generated', { dashboardUrl });

    return { dashboardUrl, message };
  } catch (err) {
    logger.error('Dashboard generation failed', { error: err.message });
    throw err;
  }
}

module.exports = { generateDashboard };
