const { withResultEnvelope } = require('../utils/resultEnvelope');
const { NAVER_MARKET_URL, NAVER_SELECTORS, SCRAPE_TIMEOUT_MS } = require('../config/constants');

const SOURCE = 'naver-kr-market';

async function readIndex(page, valueSelector, changeSelector) {
  const value = await page.$eval(valueSelector, (el) => el.textContent.trim());
  const change = await page.$eval(changeSelector, (el) => el.textContent.trim());
  return { value, change };
}

async function scrapeKrMarket(page) {
  return withResultEnvelope(SOURCE, 'KR market scraping failed', async () => {
    await page.goto(NAVER_MARKET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPE_TIMEOUT_MS,
    });

    const kospi = await readIndex(page, NAVER_SELECTORS.kospiValue, NAVER_SELECTORS.kospiChange);
    const kosdaq = await readIndex(
      page,
      NAVER_SELECTORS.kosdaqValue,
      NAVER_SELECTORS.kosdaqChange,
    );

    return { kospi, kosdaq };
  });
}

module.exports = { scrapeKrMarket };
