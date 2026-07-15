const { withResultEnvelope } = require('../utils/resultEnvelope');
const { NAVER_MARKET_URL, NAVER_SELECTORS, SCRAPE_TIMEOUT_MS } = require('../config/constants');

const SOURCE = 'naver-kr-market';

// #KOSPI_change 의 textContent 는 "427.58 +6.24%상승"처럼 등락폭·등락률·방향어가
// 한 문자열로 붙어 있다. 등락폭 자체에는 부호가 없고 방향은 "상승"/"하락" 단어로만
// 구분되므로, 방향어에서 부호를 정해 서명된 값으로 분리해 돌려준다.
function parseIndexChange(rawText) {
  const text = String(rawText).replace(/\s+/g, ' ').trim();
  const match = text.match(/([\d,]+(?:\.\d+)?)\s*([+-]?\d+(?:\.\d+)?)%/);
  if (!match) return { change: null, changePercent: null };

  const sign = text.includes('하락') ? '-' : text.includes('상승') ? '+' : '';
  const percent = match[2].startsWith('+') || match[2].startsWith('-') ? match[2] : sign + match[2];

  return {
    change: `${sign}${match[1]}`,
    changePercent: `${percent}%`,
  };
}

async function readIndex(page, valueSelector, changeSelector) {
  const value = await page.$eval(valueSelector, (el) => el.textContent.trim());
  const changeText = await page.$eval(changeSelector, (el) => el.textContent.trim());
  return { value, ...parseIndexChange(changeText) };
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

module.exports = { scrapeKrMarket, parseIndexChange };
