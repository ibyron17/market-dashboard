// ETF 티커(QQQ/DIA)와 콤마 구분 배치 조회는 FMP 무료 티어에서 프리미엄으로 막혀 있어
// 원본 지수 심볼을 개별 호출로 사용한다.
const US_INDEX_TICKERS = Object.freeze([
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: '나스닥 종합지수' },
  { symbol: '^DJI', label: '다우존스 산업평균지수' },
]);

// AI 산업과 맞닿아 있는 3개 테마(반도체/전력/배터리)의 대표 기업.
// 개별 /stable/quote 호출로 조회 가능함이 이미 검증된 심볼만 사용 (US_INDEX_TICKERS와 동일 패턴).
// 배치(콤마 구분) 조회는 FMP 무료 티어에서 프리미엄으로 막혀 있으므로 반드시 개별 호출을 유지한다.
const WATCHLIST_THEMES = Object.freeze([
  {
    key: 'semiconductor',
    label: '반도체',
    tickers: [
      { symbol: 'NVDA', label: '엔비디아' },
      { symbol: 'TSM', label: 'TSMC' },
      { symbol: 'AVGO', label: '브로드컴' },
      { symbol: 'AMD', label: 'AMD' },
    ],
  },
  {
    key: 'power',
    label: '전력',
    tickers: [
      { symbol: 'NEE', label: '넥스트에라 에너지' },
      { symbol: 'GEV', label: 'GE 버노바' },
      { symbol: 'VST', label: '비스트라' },
    ],
  },
  {
    key: 'battery',
    label: '배터리',
    tickers: [
      { symbol: 'TSLA', label: '테슬라' },
      { symbol: 'ALB', label: '앨버말' },
      { symbol: 'ENPH', label: '엔페이즈 에너지' },
    ],
  },
]);

const ALPHA_VANTAGE_RATE_LIMIT = Object.freeze({
  maxPerWindow: 5,
  windowMs: 60 * 1000,
});

const VIX_TICKER = Object.freeze({ symbol: '^VIX', label: 'VIX (변동성지수)' });

// FMP /economic-indicators?name=federalFunds 는 월별 값을 최신순으로 반환한다.
// 초보자용 추세 미니 차트에는 최근 12개월치만 있으면 충분하다.
const FED_FUNDS_HISTORY_LIMIT = 12;

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
  WATCHLIST_THEMES,
  VIX_TICKER,
  FED_FUNDS_HISTORY_LIMIT,
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
