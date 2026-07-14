// ETF 티커(QQQ/DIA)와 콤마 구분 배치 조회는 FMP 무료 티어에서 프리미엄으로 막혀 있어
// 원본 지수 심볼을 개별 호출로 사용한다.
const US_INDEX_TICKERS = Object.freeze([
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: '나스닥 종합지수' },
  { symbol: '^DJI', label: '다우존스 산업평균지수' },
]);

const ALPHA_VANTAGE_RATE_LIMIT = Object.freeze({
  maxPerWindow: 5,
  windowMs: 60 * 1000,
});

const NAVER_MARKET_URL = 'https://finance.naver.com/sise/';
// 코스피 "투자자별 매매동향" 페이지. 표 안에서 "외국인"/"기관계" 행을 텍스트로 찾아 파싱한다.
const NAVER_FOREIGN_FLOW_URL = 'https://finance.naver.com/sise/sise_index.naver?code=KOSPI';

const NAVER_SELECTORS = Object.freeze({
  kospiValue: '#KOSPI_now',
  kospiChange: '#KOSPI_change',
  kosdaqValue: '#KOSDAQ_now',
  kosdaqChange: '#KOSDAQ_change',
  investorTrendTable: 'table.type_1',
});

const SCRAPE_TIMEOUT_MS = 15000;
const SCRAPE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const TELEGRAM_MAX_MESSAGE_LENGTH = 4000;

const CLAUDE_MODEL = 'claude-sonnet-5';
const CLAUDE_MAX_TOKENS = 800;

const DASHBOARD_OUTPUT_PATH = 'dist/index.html';
// Kept outside dist/ so it never gets published as part of the public Pages site.
const TELEGRAM_MESSAGE_OUTPUT_PATH = 'artifacts/telegram-message.txt';

module.exports = {
  US_INDEX_TICKERS,
  ALPHA_VANTAGE_RATE_LIMIT,
  NAVER_MARKET_URL,
  NAVER_FOREIGN_FLOW_URL,
  NAVER_SELECTORS,
  SCRAPE_TIMEOUT_MS,
  SCRAPE_USER_AGENT,
  TELEGRAM_MAX_MESSAGE_LENGTH,
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS,
  DASHBOARD_OUTPUT_PATH,
  TELEGRAM_MESSAGE_OUTPUT_PATH,
};
