// ETF 티커(QQQ/DIA)와 콤마 구분 배치 조회는 FMP 무료 티어에서 프리미엄으로 막혀 있어
// 원본 지수 심볼을 개별 호출로 사용한다.
const US_INDEX_TICKERS = Object.freeze([
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: '나스닥 종합지수' },
  { symbol: '^DJI', label: '다우존스 산업평균지수' },
]);

// 테마별 대표 기업: 국내 3곳 + 해외 2곳.
// market: 'kr' → 네이버 시세 API(종목코드 6자리, 무료·무제한), 'us' → Alpha Vantage
// GLOBAL_QUOTE(일 25회 한도 안에서 사용 — 해외 기업 수를 늘릴 때는 한도 계산 필수).
const WATCHLIST_THEMES = Object.freeze([
  {
    key: 'semiconductor',
    label: '반도체',
    tickers: [
      { symbol: '005930', label: '삼성전자', market: 'kr' },
      { symbol: '000660', label: 'SK하이닉스', market: 'kr' },
      { symbol: '042700', label: '한미반도체', market: 'kr' },
      { symbol: 'NVDA', label: '엔비디아', market: 'us' },
      { symbol: 'TSM', label: 'TSMC', market: 'us' },
    ],
  },
  {
    key: 'power',
    label: '전력',
    tickers: [
      { symbol: '034020', label: '두산에너빌리티', market: 'kr' },
      { symbol: '267260', label: 'HD현대일렉트릭', market: 'kr' },
      { symbol: '010120', label: 'LS일렉트릭', market: 'kr' },
      { symbol: 'GEV', label: 'GE 버노바', market: 'us' },
      { symbol: 'VST', label: '비스트라', market: 'us' },
    ],
  },
  {
    key: 'battery',
    label: '배터리',
    tickers: [
      { symbol: '373220', label: 'LG에너지솔루션', market: 'kr' },
      { symbol: '006400', label: '삼성SDI', market: 'kr' },
      { symbol: '247540', label: '에코프로비엠', market: 'kr' },
      { symbol: 'TSLA', label: '테슬라', market: 'us' },
      { symbol: 'ALB', label: '앨버말', market: 'us' },
    ],
  },
  {
    key: 'construction',
    label: '건설',
    tickers: [
      { symbol: '028260', label: '삼성물산', market: 'kr' },
      { symbol: '000720', label: '현대건설', market: 'kr' },
      { symbol: '006360', label: 'GS건설', market: 'kr' },
      { symbol: 'CAT', label: '캐터필러', market: 'us' },
      { symbol: 'DHI', label: 'D.R. 호턴', market: 'us' },
    ],
  },
  {
    key: 'leisure',
    label: '레저',
    tickers: [
      { symbol: '039130', label: '하나투어', market: 'kr' },
      { symbol: '008770', label: '호텔신라', market: 'kr' },
      { symbol: '034230', label: '파라다이스', market: 'kr' },
      { symbol: 'DIS', label: '월트 디즈니', market: 'us' },
      { symbol: 'BKNG', label: '부킹홀딩스', market: 'us' },
    ],
  },
]);

const ALPHA_VANTAGE_RATE_LIMIT = Object.freeze({
  maxPerWindow: 5,
  windowMs: 60 * 1000,
});

const VIX_TICKER = Object.freeze({ symbol: '^VIX', label: 'VIX (변동성지수)' });

// Alpha Vantage FEDERAL_FUNDS_RATE(monthly)는 월별 값을 최신순으로 반환한다.
// (FMP 무료 키의 /economic-indicators는 수개월 지연된 값을 돌려줘서 AV로 전환함.)
// 초보자용 추세 미니 차트에는 최근 12개월치만 있으면 충분하다.
const FED_FUNDS_HISTORY_LIMIT = 12;

// 국내 개별 종목 시세 JSON API (키 불필요). {code} 자리에 6자리 종목코드가 들어간다.
const NAVER_STOCK_QUOTE_URL = 'https://polling.finance.naver.com/api/realtime/domestic/stock';

const NAVER_MARKET_URL = 'https://finance.naver.com/sise/';
// 코스피 "투자자별 매매동향" 페이지. 표 안에서 "외국인"/"기관계" 행을 텍스트로 찾아 파싱한다.
const NAVER_FOREIGN_FLOW_URL = 'https://finance.naver.com/sise/sise_index.naver?code=KOSPI';

const NAVER_SELECTORS = Object.freeze({
  kospiValue: '#KOSPI_now',
  kospiChange: '#KOSPI_change',
  kosdaqValue: '#KOSDAQ_now',
  kosdaqChange: '#KOSDAQ_change',
  // 2026-07 기준 투자자별 매매동향은 <table.type_1>이 아니라 dl.lst_kos_info의
  // <dd> 항목("외국인 +23,031억" 형태, 단위: 억 원)으로 렌더링된다.
  investorTrendList: 'dl.lst_kos_info dd',
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
  NAVER_STOCK_QUOTE_URL,
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
