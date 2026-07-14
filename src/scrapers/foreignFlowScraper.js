const { withResultEnvelope } = require('../utils/resultEnvelope');
const {
  NAVER_FOREIGN_FLOW_URL,
  NAVER_SELECTORS,
  SCRAPE_TIMEOUT_MS,
} = require('../config/constants');

const SOURCE = 'naver-foreign-flow';

function parseInvestorFlow(rowTexts) {
  const findLastNumber = (keyword) => {
    const row = rowTexts.find((text) => text.includes(keyword) && /-?[\d,]+/.test(text));
    if (!row) return null;
    const numbers = row.match(/-?[\d,]+/g);
    return numbers ? numbers[numbers.length - 1] : null;
  };

  return {
    foreignNetBuy: findLastNumber('외국인'),
    institutionNetBuy: findLastNumber('기관'),
  };
}

async function scrapeForeignFlow(page) {
  return withResultEnvelope(SOURCE, 'Foreign flow scraping failed', async () => {
    await page.goto(NAVER_FOREIGN_FLOW_URL, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPE_TIMEOUT_MS,
    });

    const rowTexts = await page.$$eval(`${NAVER_SELECTORS.investorTrendTable} tr`, (rows) =>
      rows.map((row) => row.textContent.replace(/\s+/g, ' ').trim()),
    );

    return parseInvestorFlow(rowTexts);
  });
}

module.exports = { scrapeForeignFlow, parseInvestorFlow };
