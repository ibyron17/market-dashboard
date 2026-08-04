const { withBrowser, createPage } = require('../scrapers/browserFactory');
const { scrapeKrMarket } = require('../scrapers/naverMarketScraper');
const { scrapeForeignFlow } = require('../scrapers/foreignFlowScraper');
const { collectUsMarket } = require('../collectors/usMarketCollector');
const { collectTreasuryYield } = require('../collectors/treasuryCollector');
const { collectWatchlist } = require('../collectors/watchlistCollector');
const { collectVix } = require('../collectors/vixCollector');
const { collectFedFundsRate } = require('../collectors/fedFundsCollector');
const { collectNaverIntegrationQuote } = require('../collectors/naverIntegrationQuote');
const { collectNaverChartHistory } = require('../collectors/naverChartHistory');
const { collectNaverMarketList } = require('../collectors/naverMarketList');
const { collectIndustryTrends } = require('../collectors/industryTrendsCollector');
const { collectStockNews } = require('../collectors/stockNewsCollector');
const { collectSecFilings, fetchSecTickerMap } = require('../collectors/secFilingsCollector');
const { collectFredMacroIndicators } = require('../collectors/fredMacroCollector');
const { generateInsight } = require('../analysis/claudeInsightGenerator');
const { formatDashboardHtml } = require('../formatters/dashboardFormatter');
const { formatDashboardLinkMessage } = require('../formatters/telegramLinkFormatter');
const { writeDashboardFile } = require('../notifiers/dashboardFileWriter');
const { loadConfig } = require('../config/env');
const { logger } = require('../utils/logger');
const { resolveDashboardUrl } = require('../utils/dashboardUrl');
const {
  DASHBOARD_OUTPUT_PATH,
  TELEGRAM_MESSAGE_OUTPUT_PATH,
  WATCHLIST_THEMES,
  CHART_HISTORY_DAYS,
  TOP_NEWS_SYMBOLS_COUNT,
  TOP_SEC_SYMBOLS_COUNT,
  NEWS_PAGE_SIZE,
  MARKET_LIST_PAGE_SIZE,
  SEC_FILINGS_LIMIT,
} = require('../config/constants');

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

// 국내 관심 기업 15종목(WATCHLIST_THEMES의 kr 항목들) 추출
function getKrWatchlistSymbols() {
  const krSymbols = [];
  WATCHLIST_THEMES.forEach((theme) => {
    theme.tickers
      .filter((t) => t.market === 'kr')
      .forEach((t) => {
        krSymbols.push({ symbol: t.symbol, label: t.label });
      });
  });
  return krSymbols;
}

// 미국 관심 기업 10종목(WATCHLIST_THEMES의 us 항목들) 추출
function getUsWatchlistSymbols() {
  const usSymbols = [];
  WATCHLIST_THEMES.forEach((theme) => {
    theme.tickers
      .filter((t) => t.market === 'us')
      .forEach((t) => {
        usSymbols.push({ symbol: t.symbol, label: t.label });
      });
  });
  return usSymbols;
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
    collectVixFn = collectVix,
    collectFedFundsRateFn = collectFedFundsRate,
    collectNaverIntegrationQuoteFn = collectNaverIntegrationQuote,
    collectNaverChartHistoryFn = collectNaverChartHistory,
    collectNaverMarketListFn = collectNaverMarketList,
    collectIndustryTrendsFn = collectIndustryTrends,
    collectStockNewsFn = collectStockNews,
    collectSecFilingsFn = collectSecFilings,
    fetchSecTickerMapFn = fetchSecTickerMap,
    collectFredMacroIndicatorsFn = collectFredMacroIndicators,
    generateInsightFn = generateInsight,
    formatDashboardHtmlFn = formatDashboardHtml,
    formatDashboardLinkMessageFn = formatDashboardLinkMessage,
    writeDashboardFileFn = writeDashboardFile,
    resolveDashboardUrlFn = resolveDashboardUrl,
  } = deps;

  try {
    const krSymbols = getKrWatchlistSymbols();
    const usSymbols = getUsWatchlistSymbols();
    const topKrSymbols = krSymbols.slice(0, TOP_NEWS_SYMBOLS_COUNT);
    const topUsSymbols = usSymbols.slice(0, TOP_SEC_SYMBOLS_COUNT);

    const secTickerMap = await fetchSecTickerMapFn();

    const results = await Promise.all([
      // 기존 수집기들
      collectUsMarketFn(config),
      collectTreasuryYieldFn(config),
      collectKrDataFn(),
      collectWatchlistFn(config),
      collectVixFn(config),
      collectFedFundsRateFn(config),
      // 신규: 국내 15종목의 통합정보
      ...krSymbols.map((s) => collectNaverIntegrationQuoteFn(s.symbol, s.label)),
      // 신규: 국내 15종목의 차트 히스토리
      ...krSymbols.map((s) => collectNaverChartHistoryFn(s.symbol, s.label, { count: CHART_HISTORY_DAYS })),
      // 신규: 시장 대량 조회
      collectNaverMarketListFn('KOSPI', { pageSize: MARKET_LIST_PAGE_SIZE }),
      collectNaverMarketListFn('KOSDAQ', { pageSize: MARKET_LIST_PAGE_SIZE }),
      // 신규: 업종별 등락
      collectIndustryTrendsFn(),
      // 신규: 상위 5 국내 종목 뉴스
      ...topKrSymbols.map((s) => collectStockNewsFn(s.symbol, { pageSize: NEWS_PAGE_SIZE })),
      // 신규: SEC 공시 (상위 5 미국 종목)
      ...topUsSymbols.map((s) => collectSecFilingsFn(s.symbol, secTickerMap, { limit: SEC_FILINGS_LIMIT })),
      // 신규: FRED 거시 지표
      collectFredMacroIndicatorsFn(config),
    ]);

    const baseResults = results.slice(0, 6);
    const [usMarket, treasury, krData, watchlist, vix, fedFunds] = baseResults;

    // 국내 15종목 통합정보 & 차트 히스토리 병합
    const integrationResults = results.slice(6, 6 + krSymbols.length);
    const chartResults = results.slice(6 + krSymbols.length, 6 + krSymbols.length * 2);
    const stockDetails = krSymbols.map((symbol, idx) => ({
      symbol: symbol.symbol,
      label: symbol.label,
      integration: integrationResults[idx],
      trend: chartResults[idx],
    }));

    // 시장 대량 조회
    const kospiResult = results[6 + krSymbols.length * 2];
    const kosdaqResult = results[6 + krSymbols.length * 2 + 1];
    const marketList = { kospi: kospiResult, kosdaq: kosdaqResult };

    // 업종별 등락
    const industryResult = results[6 + krSymbols.length * 2 + 2];

    // 뉴스 (상위 5 국내 종목)
    const newsResults = results.slice(6 + krSymbols.length * 2 + 3, 6 + krSymbols.length * 2 + 3 + topKrSymbols.length);
    const stockNewsBySymbol = {};
    topKrSymbols.forEach((s, idx) => {
      stockNewsBySymbol[s.symbol] = newsResults[idx];
    });

    // SEC 공시 (상위 5 미국 종목)
    const secResults = results.slice(6 + krSymbols.length * 2 + 3 + topKrSymbols.length, 6 + krSymbols.length * 2 + 3 + topKrSymbols.length + topUsSymbols.length);
    const secFilingsByTicker = {};
    topUsSymbols.forEach((s, idx) => {
      secFilingsByTicker[s.symbol] = secResults[idx];
    });

    // FRED
    const fredResult = results[results.length - 1];

    const sections = {
      usMarket,
      treasury,
      krMarket: krData.krMarket,
      foreignFlow: krData.foreignFlow,
      watchlist,
      vix,
      fedFunds,
      stockDetails,
      marketList,
      industryTrends: industryResult,
      stockNews: stockNewsBySymbol,
      secFilings: secFilingsByTicker,
      macroIndicators: fredResult,
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
