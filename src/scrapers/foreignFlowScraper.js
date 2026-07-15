const { withResultEnvelope } = require('../utils/resultEnvelope');
const {
  NAVER_FOREIGN_FLOW_URL,
  NAVER_SELECTORS,
  SCRAPE_TIMEOUT_MS,
} = require('../config/constants');

const SOURCE = 'naver-foreign-flow';

// 항목 텍스트는 "외국인 +23,031억" 형태다(단위: 억 원). 부호가 붙은 마지막 숫자를
// 골라 그대로 돌려주고, "억 원" 단위 표기는 렌더러가 붙인다.
function parseInvestorFlow(rowTexts) {
  const findLastNumber = (keyword) => {
    const row = rowTexts.find((text) => text.includes(keyword) && /[+-]?[\d,]+/.test(text));
    if (!row) return null;
    const numbers = row.match(/[+-]?[\d,]+/g);
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

    const rowTexts = await page.$$eval(NAVER_SELECTORS.investorTrendList, (items) =>
      items.map((item) => item.textContent.replace(/\s+/g, ' ').trim()),
    );

    return parseInvestorFlow(rowTexts);
  });
}

module.exports = { scrapeForeignFlow, parseInvestorFlow };
