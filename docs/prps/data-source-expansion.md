# 데이터 수집 계층 5단계 확장 설계서 (PRP)

## 요구사항 요약

현재 market-dashboard는 Alpha Vantage / FMP REST API와 Playwright 스크래핑으로 미국 증시, 국내 증시, 외국인 동향, 관심 기업 주가를 수집한다. 이 설계는 네이버 비공제 API 5단계(종목 통합정보, 일봉 히스토리, 시장 대량 조회, 업종별 등락, 거시지표 FRED)를 도입해 다음을 달성한다:

1. **종목 수준 심화 정보**: PER/EPS, 투자의견 컨센서스, 목표주가, 연구 리포트
2. **기술적 분석**: 52주 고저가, 일봉 차트(200일 이동평균선)
3. **시장 구조 분석**: 업종별 등락, 상승/하락 기업 비율
4. **거시 경제 지표**: FRED(연방준비제도 경제 데이터) — 장단기금리차, 실업률, CPI, 달러 인덱스 등
5. **정보 확충**: 뉴스 헤드라인, SEC 공시

**범위 밖 (하지 않을 것)**:
- 특정 종목 매수/매도 추천. 기존 정책 유지(Claude 인사이트에 가드레일 적용).
- 실시간 호가/체결. 일일 종가 기준 대시보드 유지.
- 국내 공시(DART 크롤링). 해외 투자자 관심도 낮음 → 스코프 외.

---

## 영향 범위

### 신규 파일 (10개)

#### collectors/
- `naverIntegrationQuote.js` (200줄) — 종목 통합정보 API 호출 + 파싱. datas[] 배열, totalInfos[] 필드 추출, 컨센서스/목표주가 처리.
- `naverChartHistory.js` (180줄) — 일봉 히스토리 XML 파싱. EUC-KR 인코딩 처리(또는 숫자 정규식 추출), 200일 이동평균 계산.
- `naverMarketList.js` (220줄) — KOSPI/KOSDAQ 시장 대량 조회. 기존 Playwright 스크래퍼를 API로 대체.
- `industryTrends.js` (160줄) — 업종별 등락 카테고리 조회. groups[] 배열 처리.
- `fredMacroIndicators.js` (240줄) — FRED API 클라이언트 + 다중 시리즈 조회. API 키 미설정 시 안전 처리(empty array 반환).

#### formatters/
- `naverDataRenderer.js` (300줄) — 종목 통합정보, 차트, 시장 대량 조회용 렌더 함수 모음. renderCard 패턴 유지, HTML 테이블 조합.

#### utils/
- `naverRateLimiter.js` (80줄) — 네이버 비공개 API 전용 rate limiter. minGapMs = 500ms (무제한이지만 로테이션 대응).
- `fredApiClient.js` (120줄) — FRED API 클라이언트. series_id 배열 받아 병렬 조회, API 키 검증.

#### config/
- 기존 `constants.js`에 신규 상수 추가 (아래 참고).

### 수정 파일 (7개)

#### config/constants.js
- NAVER_INTEGRATION_URL, NAVER_CHART_URL, NAVER_MARKET_LIST_URL, NAVER_INDUSTRY_URL 추가
- FRED_BASE_URL, FRED_SERIES_IDS (객체: 시리즈명 → {id, label, description})
- NAVER_RATE_LIMIT (minGapMs: 500)
- GLOSSARY 항목 추가 (PER, EPS, 컨센서스, 목표주가, 이동평균, 업종, 장단기금리차, 실업률 등)

#### pipeline/generateDashboard.js
- collectIntegrationInfoFn, collectChartHistoryFn, collectMarketListFn, collectIndustryFn, collectMacroIndicatorsFn 추가
- Promise.all에 신규 수집기 5개 병렬 추가
- sections 객체에 integrationInfo, chartHistory, marketList, industry, macroIndicators 추가

#### formatters/dashboardFormatter.js
- renderIntegrationInfo, renderChartHistory, renderMarketList, renderIndustry, renderMacroIndicators 렌더 함수 호출 추가
- 카드 배치 순서: (기존 순서 유지) insight → usMarket → vix → krMarket → **integrationInfo** → **chartHistory** → foreignFlow → **marketList** → **industry** → **macroIndicators** → watchlist → disclaimer

#### formatters/dashboardSections.js
- 기존 함수들 유지, 신규 5개 render 함수 내용 이동 (naverDataRenderer.js에서 import)

#### scrapers/naverMarketScraper.js
- 단계 3 이후로는 deprecate 경고 추가. 향후 제거 계획.

#### analysis/promptBuilder.js
- integrationInfo, chartHistory, industry, macroIndicators를 Claude 프롬프트에 추가. 정보량 증가에 따라 프롬프트 구조 재검토 (섹션별 요약 형식).

---

## 데이터 모델

### 1단계: 종목 통합정보

**수집 함수 입력/출력**:

```javascript
/**
 * @param {string} code - 6자리 종목 코드 (예: "005930")
 * @param {Object} deps - 의존성 주입 {fetchNaverIntegration}
 * @returns {Promise<Object>} integrationData
 */
async function fetchStockIntegration(code, deps)

/**
 * 종목별 통합정보 파싱
 * @param {Object} body - API 응답 JSON (totalInfos[], dealTrendInfos[], consensusInfo, researches[] 등)
 * @param {string} ticker - 종목 객체 {symbol, label}
 * @returns {Object}
 */
function parseStockIntegration(body, ticker)
```

**반환 데이터 모델**:

```javascript
{
  // result envelope 래핑 (status: 'ok' | 'error')
  status: 'ok',
  source: 'naverIntegration',
  data: {
    symbol: '005930',
    label: '삼성전자',
    integrationInfo: {
      // 표시용 키-값 쌍 (totalInfos에서 추출)
      closePrice: { label: '종가', value: '262,500' },
      openPrice: { label: '시가', value: '267,000' },
      highPrice: { label: '고가', value: '267,000' },
      lowPrice: { label: '저가', value: '243,000' },
      per: { label: 'PER', value: '15.23배' },
      eps: { label: 'EPS', value: '17,215원' },
      cnsPer: { label: '추정PER', value: '14.89배' },
      cnsEps: { label: '추정EPS', value: '17,612원' },
      foreignRate: { label: '외인소진율', value: '46.53%' },
      highPriceOf52Weeks: { label: '52주 고가', value: '331,000' },
      lowPriceOf52Weeks: { label: '52주 저가', value: '210,000' },
      marketValue: { label: '시가총액', value: '1,534조 6,481억' },
    },
    // 최근 3일 수급 추이
    recentDealTrends: [
      {
        bizdate: '20260801',
        foreignerBuyQuant: 8_359_011,
        foreignerHoldRatio: '46.68%',
        closePrice: 262_500,
      },
      // ... (2일, 1일 전)
    ],
    consensus: {
      // consensusInfo에서 추출 (없으면 null)
      investmentOpinion: '4.04', // 평균 투자의견 (1=강매수~5=강매도)
      priceTarget: '501,042', // 목표주가
    },
    recentResearch: [
      {
        date: '20260731',
        title: '분기 실적 턴어라운드 가능성 높음',
        company: 'NH투자증권',
      },
      // ... (최근 2개)
    ],
  },
  fetchedAt: '2026-08-04T02:06:38.021Z',
}
```

---

### 2단계: 일봉 히스토리

**수집 + 파싱**:

```javascript
async function fetchChartHistory(code, { count = 200 } = {}, deps)
function parseChartHistory(xmlBodyOrText, code)
```

**반환 데이터 모델**:

```javascript
{
  status: 'ok',
  source: 'naverChartHistory',
  data: {
    symbol: '005930',
    label: '삼성전자',
    ohlcv: [
      { date: '20260731', open: 267000, high: 267000, low: 243000, close: 262500, volume: 57883859 },
      // ... (199일)
    ],
    ma200: 265_432, // 200일 이동평균선 (최근 200개 종가로 계산)
    highestPriceIn52Weeks: 331_000,
    lowestPriceIn52Weeks: 210_000,
  },
  fetchedAt: '...',
}
```

**주의**: XML은 EUC-KR 인코딩. 두 가지 방식 중 단순성 기준으로 선택:
- **방식 A** (권장): iconv-lite 의존성 추가, 정확한 파싱
- **방식 B**: 숫자만 정규식으로 추출 (의존성 없음, 한글 무시)

설계 단계에서는 **방식 B를 기본값**으로 한다(YAGNI). 스키마 변경 시 방식 A로 전환 가능하도록 문서화.

---

### 3단계: 시장 대량 조회 (KOSPI/KOSDAQ)

**수집 함수**:

```javascript
async function fetchMarketList(market, { page = 1, pageSize = 100 } = {}, deps)
// market: 'KOSPI' | 'KOSDAQ'

function parseMarketList(body, market)
```

**반환 데이터 모델**:

```javascript
{
  status: 'ok',
  source: 'naverMarketList',
  data: {
    market: 'KOSPI',
    totalCount: 926,
    stocks: [
      {
        code: '005930',
        name: '삼성전자',
        closePrice: 262_500,
        priceChange: 12_500, // 전일 대비 (절대값)
        priceChangePercent: 4.98, // 부호 포함
        direction: 'RISING', // 'RISING' | 'FALLING' | 'EVEN' | 'UPPER_LIMIT' | 'LOWER_LIMIT'
        volume: 57_883_859,
        tradingValue: 15_234_567_890_000, // 거래대금
        marketValue: 1_534_600_000_000_000, // 시가총액
      },
      // ... (pageSize개)
    ],
    pagination: {
      currentPage: 1,
      pageSize: 100,
      totalPages: 10,
    },
  },
  fetchedAt: '...',
}
```

**목적**: 기존 Playwright naverMarketScraper를 대체. 스크래핑보다 안정적이고 빠름.

---

### 4-a단계: 업종별 등락

**수집 함수**:

```javascript
async function fetchIndustryTrends(deps)

function parseIndustryTrends(body)
```

**반환 데이터 모델**:

```javascript
{
  status: 'ok',
  source: 'industryTrends',
  data: {
    lastUpdated: '20260731T150000',
    industries: [
      {
        no: 1,
        name: '반도체와반도체장비',
        totalCount: 23,
        changeRate: 28.03, // 업종 등락률 (부호 포함)
        direction: 'RISING',
        riseCount: 19,
        fallCount: 3,
        steadyCount: 1,
      },
      // ... (모든 업종)
    ],
    topRising: [
      { name: '반도체', changeRate: 28.03 },
      // ... (상위 3개)
    ],
    topFalling: [
      { name: '소재', changeRate: -3.45 },
      // ... (하위 3개)
    ],
  },
  fetchedAt: '...',
}
```

---

### 4-b단계: FRED 거시 지표

**수집 함수**:

```javascript
/**
 * @param {Object} config - {FRED_API_KEY?, FRED_SERIES_IDS}
 * @returns {Promise<Object>} macroData with result envelope
 */
async function fetchMacroIndicators(config, deps)
```

**반환 데이터 모델**:

```javascript
{
  status: 'ok', // or 'error' if API key missing
  source: 'fredMacroIndicators',
  data: {
    series: {
      T10Y2Y: {
        label: '장단기금리차 (10Y-2Y)',
        description: '침체 신호. 음수면 역 수익률곡선(경기 약세 신호)',
        latestValue: 0.35,
        latestDate: '2026-08-01',
        unit: '%',
        recent10Days: [
          { date: '2026-08-01', value: 0.35 },
          // ... (최근 10개)
        ],
      },
      DGS10: {
        label: '10년물 국채금리',
        // ...
      },
      FEDFUNDS: {
        label: '연방기준금리(월평균)',
        // ...
      },
      UNRATE: {
        label: '실업률',
        latestValue: 4.2,
        unit: '%',
        // ...
      },
      CPILFESL: {
        label: '근원 CPI',
        unit: '%',
        // ...
      },
      DTWEXBGS: {
        label: '달러 인덱스',
        // ...
      },
      // 추가 시리즈 선택적 포함
    },
  },
  fetchedAt: '...',
}
```

**API 키 미설정 처리**:
- status: 'error', data: {} 반환
- 렌더링: "FRED 데이터 미설정. `config/constants.js`에 `FRED_API_KEY` 환경변수를 설정하세요."

---

### 5단계: 뉴스 및 공시

**5-a. 국내 뉴스** (naverNews.js)

```javascript
async function fetchStockNews(code, { limit = 5 } = {}, deps)

function parseStockNews(body, code)
```

**반환 데이터 모델**:

```javascript
{
  status: 'ok',
  source: 'naverNews',
  data: {
    symbol: '005930',
    news: [
      {
        title: '삼성전자, 분기 실적 턴어라운드... 목표주가 상향',
        url: 'https://news.naver.com/...',
        source: '한국경제',
        datetime: '2026-08-01T06:30:00Z',
      },
      // ... (4개 더)
    ],
  },
  fetchedAt: '...',
}
```

**주의**: API 응답에서 제목이 HTML 엔티티(&quot;, &amp; 등)로 이스케이프됨 → htmlEscape.js의 unescapeHtml 함수 사용.

**5-b. US 공시** (secFiling.js)

```javascript
async function fetchSecFiling(ticker, { limit = 3 } = {}, deps)
// ticker: 'NVDA' → CIK 조회 → SEC EDGAR 공시 목록

function parseSecFiling(body, ticker)
```

**반환 데이터 모델**:

```javascript
{
  status: 'ok',
  source: 'secFiling',
  data: {
    symbol: 'NVDA',
    filings: [
      {
        accessionNumber: '0001193125-26-123456',
        filingDate: '2026-08-01',
        form: '10-Q', // '10-K', '8-K', '10-Q' 등
        title: 'Q3 2026 Earnings',
        url: 'https://www.sec.gov/cgi-bin/viewer?action=view&...',
      },
      // ... (2개 더)
    ],
  },
  fetchedAt: '...',
}
```

**주의**:
- SEC EDGAR는 User-Agent에 이메일 필수 (robots.txt 정책)
- CIK → ticker 매핑은 사전 로드 (company_tickers.json)
- API 응답이 컬럼 병렬 배열 형식이므로 인덱싱으로 행 재구성

---

## 모듈 구조와 파일 배치

```
src/
├── collectors/
│   ├── (기존 5개)
│   ├── naverIntegrationQuote.js       # 1단계
│   ├── naverChartHistory.js           # 2단계
│   ├── naverMarketList.js             # 3단계 (fetchMarketList, parseMarketList)
│   ├── industryTrends.js              # 4-a단계
│   ├── fredMacroIndicators.js         # 4-b단계
│   ├── naverNews.js                   # 5-a단계
│   └── secFiling.js                   # 5-b단계 (CIK 매핑 포함)
├── formatters/
│   ├── dashboardFormatter.js          # (수정: 신규 카드 렌더 호출 추가)
│   ├── dashboardSections.js           # (수정: 기존 함수 유지, 신규 호출 통합)
│   ├── naverDataRenderer.js           # (신규: 종목/시장/업종/뉴스 카드 렌더 함수 모음)
│   ├── fredDataRenderer.js            # (신규: FRED 지표 테이블/차트 렌더)
│   ├── glossary.js                    # (수정: PER/EPS/컨센서스/장단기금리차 등 설명 추가)
│   └── (기존 3개)
├── utils/
│   ├── naverRateLimiter.js            # (신규: 네이버 API 전용 rate limiter)
│   ├── fredApiClient.js               # (신규: FRED API 래퍼)
│   ├── (기존 6개)
├── config/
│   ├── constants.js                   # (수정: 신규 URL, RATE_LIMIT, FRED_SERIES_IDS, GLOSSARY 항목)
│   └── (기존 1개)
├── pipeline/
│   ├── generateDashboard.js           # (수정: 신규 5개 수집기 병렬 추가)
│   └── (기존 1개)
├── analysis/
│   └── promptBuilder.js               # (수정: 신규 데이터 섹션 프롬프트 추가)
└── (기존 디렉토리: scrapers, notifiers)
```

---

## 렌더링 설계 및 초보자 용어

### 대시보드 카드 배치 — 4개 그룹 구성 [사용자 승인 2026-08-01]

카드를 14개로 평면 나열하지 않는다. **초보자용이라는 목표를 지키기 위해 4개 그룹으로 묶고,
상세 표는 접기(`<details>` 아코디언) 안에 넣어 첫 화면 정보량을 억제한다.**
데이터는 5단계 전부 수집하되 표시만 정리하는 방식이다.

**그룹 1 — 오늘의 시장** (펼침 상태)
- AI 인사이트 (기존)
- 🇺🇸 미국 증시 / 😨 VIX / 🇰🇷 국내 증시 (기존)
- 🏭 업종별 등락 (신규) — 상승 상위 5 / 하락 하위 3만. "오늘 어느 분야에 돈이 몰렸나"

**그룹 2 — 관심 기업 심화** (요약 펼침 + 상세 접기)
- 🏢 테마별 관심 기업 (기존 탭 UI 유지)
- 펼친 상태: 주가·등락 (기존 그대로)
- 접기 안: PER·추정PER·컨센서스·목표주가·52주 고저·외국인 순매수 (신규 1단계)
- 접기 안: 200일 이동평균 대비 위치 (신규 2단계) — 종목별 차트는 그리지 않고
  "200일선 위/아래 + 괴리율" 한 줄 요약으로 축약(정보 과잉 방지)

**그룹 3 — 수급과 시장 전체** (접기 기본)
- 💱 외국인·기관 동향 (기존)
- 💹 시가총액 상위 종목 (신규 3단계) — KOSPI/KOSDAQ 각 10행

**그룹 4 — 거시 경제** (접기 기본)
- 🇰🇷 기준금리 / 💵 미국 국채금리 (기존)
- 💰 FRED 거시지표 (신규 4-b) — 장단기금리차 중심으로 5개만
- 📰 뉴스 & 공시 (신규 5단계) — 국내 뉴스 5건 + 미국 공시 5건

**정보 밀도 제어**:
- 첫 화면(접기 펼치기 전)에 보이는 카드는 기존과 비슷한 수준으로 유지
- 테이블은 최대 15행
- 신규 지표는 "주요 3~5개만 표시" 원칙
- `<details>`는 JS 없이 동작하므로 기존 정적 HTML 구조를 깨지 않는다

### 수집 범위 [사용자 승인 2026-08-01]

**국내 15종목만 심화 수집.** 네이버 통합정보 API는 국내 종목만 지원하므로
해외 10종목은 기존 Alpha Vantage 시세만 유지한다(AV 한도 절약).

| 항목 | 대상 | 호출 수 |
|---|---|---|
| 통합정보(PER·컨센서스·수급) | 국내 관심기업 15 | 15 |
| 일봉 히스토리 | 국내 관심기업 15 | 15 |
| 시장 대량 조회 | KOSPI, KOSDAQ | 2 |
| 업종별 등락 | 전체 1회 | 1 |
| 종목 뉴스 | 상위 5종목 | 5 |
| **네이버 소계** | | **약 38회** |
| FRED | 5개 시리즈 | 5 |
| SEC EDGAR | 미국 5종목 + CIK맵 1 | 6 |
| Alpha Vantage | 기존 유지 | 12 |

### Glossary 추가 항목

```javascript
{
  // (기존 항목들)
  per: 'PER(주가순이익비율)는 현재 주가를 연간 주당순이익(EPS)으로 나눈 값으로, 저울 같은 역할을 해요. PER이 낮을수록 주가가 싼 편이라고 흔히 해석됩니다. (예: PER 15배 = 현재 이익 규모를 15년 벌어야 주가 회수)',
  eps: 'EPS(주당순이익)는 기업의 순이익을 발행 주식 수로 나눈 값이에요. EPS가 높을수록 주당 벌어들이는 이익이 크다는 뜻입니다.',
  // [검증 완료 2026-08-01] 네이버 recommMean 척도는 "높을수록 긍정"이다.
  // 삼성전자/SK하이닉스/두산에너빌리티/하나투어/호텔신라 5종목 모두 4.0 전후이며
  // 목표주가가 현재가보다 60~110% 높다. 1=강매수 척도로 오해하면 정반대로 표시된다.
  consensus: '투자의견 컨센서스는 증권사 애널리스트들의 평균 의견을 1~5로 나타낸 값이에요. 숫자가 높을수록 긍정적으로 보는 의견이 많다는 뜻입니다. 다만 애널리스트 의견은 대체로 긍정 쪽에 몰리는 경향이 있어 참고 지표로만 보세요.',
  priceTarget: '증권사 애널리스트들이 제시한 목표주가의 평균이에요. "앞으로 이 정도 가격을 예상한다"는 전망일 뿐 보장이 아니고, 실제로 목표주가는 현재가보다 높게 제시되는 경우가 많습니다. 작성 시점(기준일)이 지금과 다를 수 있다는 점도 함께 봐주세요.',
  ma200: '200일 이동평균선은 최근 200거래일 종가의 평균으로, 주가의 중장기 추세를 보는 기술적 분석 지표예요. 현재 주가가 200일선 위에 있으면 상승 추세, 아래에 있으면 하락 추세로 흔히 해석됩니다.',
  industry: '업종별 등락은 동일 업종 내 기업들이 전반적으로 얼마나 오르거나 내렸는지를 보여줘요. 반도체 업종이 크게 오르면 반도체 관련 모든 기업들이 거래 흐름 상 함께 오르는 경향이 있습니다.',
  yieldCurve: '미국의 장기(10년) 국채금리에서 단기(2년) 국채금리를 뺀 값으로, 경제 침체 신호입니다. 값이 음수(역 수익률곡선)면 경기 약세를 경고하는 신호로 흔히 해석됩니다.',
  fedRate: '미국 중앙은행(Fed)의 연방기준금리는 미국 은행 간 자금 거래 기준금리예요. 이 금리가 올라가면 전 세계 자금 이동이 미국으로 쏠리고, 미국을 제외한 다른 지역 자산의 상대적 매력이 줄어듭니다.',
  unrate: '실업률은 구직 활동을 하는 실업자 비율이에요. 높아지면 일자리가 줄어들고 있다는 신호로, 주식 시장에는 부정적입니다.',
  dollarIndex: '달러 인덱스는 미국 달러의 국제 가치를 나타내요. 이 지수가 올라가면 달러 강세, 내려가면 달러 약세입니다. 달러가 강해지면 신흥국 자산, 달러가 약해지면 원자재와 비달러 자산이 상대적으로 매력적이 됩니다.',
}
```

---

## AI 인사이트 프롬프트 확장

**기존 구조** (promptBuilder.js):
- sections 객체를 텍스트로 변환 → Claude에게 전달 → 초보자용 해석 생성

**신규 확장**:
- integrationInfo: "상위 5 종목의 PER, 컨센서스, 목표주가 요약"
- chartHistory: "기술적 지표(200일선 관계) 해석"
- industry: "상승/하락 업종 분석"
- macroIndicators: "장단기금리차, 실업률 등 거시 신호"
- news: "뉴스 헤드라인 톤 분석 (긍정/부정)" (선택적)

**프롬프트 재구조화** (토큰 절감):
- 현재: 전체 데이터 전달 → Claude가 요약
- 변경: 파이썬/JS에서 핵심 요약만 전달 → Claude가 통합 해석

예:
```
[미국 증시]
S&P500: +2.3% (4,800 → 4,910), 나스닥: +3.1% (16,000 → 16,496)
VIX: 18.5 (평온함)

[한국 증시]
코스피: -1.2%, 코스닥: -0.8%
외국인: -500억 원 (순매도), 기관: +300억 원 (순매수)

[기술적 신호]
삼성전자: 200일선 위 (상승세), SK하이닉스: 200일선 아래 (약세)

[거시 신호]
장단기금리차: +0.35% (평상), 실업률: 4.2% (상승 중)
달러 인덱스: 103.2 (강세)

[뉴스 톤]
긍정: +5 (AI 호황, 기술주 랠리), 부정: -2 (경기 둔화 우려)

[분석]
- 미국 기술주 강세, 반도체 섹터 특히 활발
- 한국 증시는 실적 우려로 약세
- 외국인 매도 → 글로벌 수익실현 신호
```

---

## 에러 및 스키마 변경 대응 전략

### 네이버 비공개 API의 위험 관리

**위험**: 응답 스키마가 예고 없이 변경될 수 있음 (비공개 API이므로 버전 관리 없음)

**대응**:

1. **필드 검증 강화**:
   - 각 파싱 함수에서 null/undefined 체크 의무화
   - 예: `data?.totalInfos?.[0]?.value ?? null`

2. **부분 실패 격리** (result envelope):
   - 한 필드 파싱 실패 → 해당 필드만 null로 표시 (카드 전체 실패 아님)
   - 예: consensusInfo가 없으면 `consensus: null` 반환

3. **스키마 변경 탐지** (로깅):
   - 예상 필드 누락 시 경고 로그 기록
   - 사용자가 대시보드 렌더링은 되지만 해당 필드만 "데이터 없음"으로 표시

4. **대체 전략**:
   - naverMarketList 실패 → 기존 Playwright 스크래퍼 폴백 (deprecate되기 전)
   - integrationInfo 실패 → naverStockQuote로 최소 주가 정보만 표시
   - FRED 실패 → 카드 자체 생략, 다른 지표만 표시

### FRED API 키 미설정

**대응**:
- config에서 `FRED_API_KEY` 체크
- 없으면 fredMacroIndicators가 status: 'error' 반환
- 렌더링: "FRED 데이터 미설정" 안내 카드 (사용자 액션 요청)
- 전체 대시보드는 정상 생성됨

---

## 테스트 계획

### 1. 단위 테스트 (순수 파싱 함수)

**대상**: naverIntegrationQuote.js, naverChartHistory.js, parseMarketList, parseIndustryTrends, fredMacroIndicators 파싱

**테스트 픽스처** (test/fixtures/):
- `naver-integration-response.json` — totalInfos[], consensusInfo, researches[] 조합 응답
- `naver-chart-euc-kr.xml` — EUC-KR 원본 XML (숫자 정규식 추출 테스트)
- `naver-market-list-kospi.json` — KOSPI 100개 항목
- `naver-industry-trends.json` — 전체 업종 그룹
- `fred-api-response.json` — 6개 시리즈 데이터

**테스트 케이스** (각 파싱 함수당 3~5개):
- 정상 응답 파싱 ✓
- null/undefined 필드 안전 처리 ✓
- 빈 배열 (consensusInfo = null) 처리 ✓
- 타입 변환 (문자열 → 숫자) ✓
- 인코딩 변환 (EUC-KR XML) ✓

### 2. 통합 테스트 (수집기 + 렌더링)

**대상**: generateDashboard의 신규 데이터 섹션

**테스트 케이스**:
- 5개 신규 수집기 모두 병렬 실행, 모두 success ✓
- 일부 실패(예: FRED 키 미설정) 시 나머지 정상 렌더링 ✓
- 생성된 HTML에 신규 카드 모두 포함 ✓

### 3. 엔드-투-엔드 테스트 (실제 환경)

**대상**: GitHub Actions 워크플로

**테스트 시나리오**:
- 모든 API 키 설정 → 전체 대시보드 생성 ✓
- FRED 키 미설정 → 해당 카드만 대체 텍스트 ✓
- 네이버 API 응답 지연(>15초) → timeout 후 해당 카드만 에러 표시 ✓

---

## 위험 요소와 대안

### 위험 1: 네이버 API 응답 지연 또는 스키마 변경

**개연성**: 높음 (비공개 API)

**영향**: 카드별 실패 격리로 부분 대시보드 생성 (전체 실패 아님)

**검토한 대안**:
- A) 네이버 API 재시도 (3회) — 채택 안 함 (로테이션 대응 어려움, 타임아웃 위험)
- B) Playwright 스크래퍼 조합 — 채택 안 함 (느리고 유지보수 비용 높음)

**선택**: 현재 구조(result envelope + 부분 실패 격리) 유지. 신규 API도 동일 패턴.

---

### 위험 2: 호출량 폭증

**배경**: 현재 12회/일 (AV 국채금리, 기준금리, 관심 기업 10개). 신규 추가 시:
- 네이버 API: 일 8회 추가 (종목 5개 × 1.5회 — 통합정보 + 차트 히스토리 중복 가능)
- FRED: 일 1회 (6개 시리즈 배치 조회)

**영향**: AV 무료 한도(일 25회) 안전 마진 확보

**선택**: 
- 네이버는 무제한 (비공개 API 로테이션만 주의 → minGapMs: 500ms)
- 기존 AV 호출(12회) 유지 → 신규 FRED(1회) 추가 → 합계 13회 (한도 내)
- 필요 시 나중에 naverStockQuote(5회) → naverIntegrationQuote(통합, 1회)로 대체 가능

---

### 위험 3: 프롬프트 토큰 증가

**배경**: integrationInfo, chartHistory, industry, macroIndicators 추가 → Claude 인사이트 프롬프트 증가

**영향**: API 비용 증가

**선택**: 
- 파일단에서 요약(PER 상위 5개, 업종 상위/하위 각 3개) → 프롬프트 증가 최소화
- 현재 claude-sonnet-5 모델 유지, 토큰 감시

---

## 단계별 구현 순서 및 검증 기준

### 개요

5단계를 2~3주에 걸쳐 5개 PR로 분할. 각 단계는 **독립적으로 병합 가능**.

---

### **Phase 1: 준비 (1일, PR#1)**

**목표**: config/constants, 공용 모듈 정비

**작업**:
1. `config/constants.js` 수정
   - NAVER_INTEGRATION_URL, NAVER_CHART_URL, NAVER_MARKET_LIST_URL, NAVER_INDUSTRY_URL
   - FRED_BASE_URL, FRED_SERIES_IDS 객체 (T10Y2Y, DGS10, FEDFUNDS, UNRATE, CPILFESL, DTWEXBGS)
   - NAVER_RATE_LIMIT (minGapMs: 500)
   - GLOSSARY 8개 항목 추가 (per, eps, consensus, priceTarget, ma200, industry, yieldCurve, fedRate, unrate, dollarIndex)

2. `utils/naverRateLimiter.js` 신규 생성
   - createRateLimiter 재사용하되, minGapMs: 500ms로 설정

3. `utils/fredApiClient.js` 신규 생성
   - fetchFredSeries(seriesIds, apiKey) 함수
   - API 키 검증, 배치 요청, 에러 처리

**검증 기준**:
- [ ] npm run lint 통과
- [ ] 신규 파일 단위 테스트 5개 통과
- [ ] constants 내 URL과 rate limit 값 정확

**PR 제목**: `refactor: 데이터 수집 확장을 위한 기초 설정 (constants, utils)`

---

### **Phase 2: 종목 심화 정보 (2일, PR#2)**

**목표**: 1단계 종목 통합정보 통합, 렌더링

**작업**:
1. `collectors/naverIntegrationQuote.js` 신규
   - fetchNaverIntegration(code, deps)
   - parseStockIntegration(body, ticker)
   - watchlist 5개 테마의 대표 종목 3개씩(KR) 수집 대상 정의

2. `formatters/naverDataRenderer.js` 신규
   - renderIntegrationInfo(section) 함수
   - 테이블: 종목명, PER, EPS, 컨센서스, 목표주가, 52주 고저가

3. `pipeline/generateDashboard.js` 수정
   - collectIntegrationInfoFn 추가 (Promise.all)
   - sections.integrationInfo 추가

4. `formatters/dashboardFormatter.js` 수정
   - renderIntegrationInfo 호출, 카드 배치(미국증시 다음)

5. `test/unit/collectors/naverIntegrationQuote.test.js` 신규
   - 정상 파싱, null 필드 처리, 빈 consensusInfo 처리

**검증 기준**:
- [ ] npm test 통과 (신규 5개 테스트 포함)
- [ ] npm run report:local 실행 → dist/index.html에 "오늘의 주요 종목" 카드 렌더링 확인
- [ ] 종목 5개 모두 PER/EPS/컨센서스 표시 확인 (또는 해당 데이터 없으면 "-")

**PR 제목**: `feat: 종목 통합정보 카드 추가 (PER, EPS, 컨센서스, 목표주가)`

---

### **Phase 3: 기술적 분석 (2일, PR#3)**

**목표**: 2단계 일봉 차트 + 200일 이동평균선

**작업**:
1. `collectors/naverChartHistory.js` 신규
   - fetchChartHistory(code, {count}, deps)
   - parseChartHistory(xmlOrText, code)
   - EUC-KR 처리: 정규식으로 숫자만 추출 (숫자|날짜 패턴)
   - 200일 이동평균선 계산

2. `formatters/naverDataRenderer.js` 수정
   - renderChartHistory(section) — Chart.js 미니 차트 (200일 라인 + 현재 주가)

3. `pipeline/generateDashboard.js` 수정
   - collectChartHistoryFn 추가

4. `formatters/dashboardFormatter.js` 수정
   - renderChartHistory 호출

5. `test/unit/collectors/naverChartHistory.test.js` 신규
   - EUC-KR XML 파싱, 숫자 추출, 200일선 계산

**검증 기준**:
- [ ] npm test 통과
- [ ] 생성된 HTML에 Chart.js 차트 렌더링 (200일선 가시적)
- [ ] 차트가 로드되면 "📈 기술 분석" 카드 완성

**PR 제목**: `feat: 일봉 차트 및 200일 이동평균선 추가`

---

### **Phase 4: 시장 및 거시 (3일, PR#4)**

**목표**: 3단계 시장 대량 조회, 4단계 업종별, FRED 지표

**작업**:
1. `collectors/naverMarketList.js` 신규
   - fetchMarketList(market: 'KOSPI'|'KOSDAQ', deps)
   - parseMarketList(body, market)
   - 상위 15개 종목 추출

2. `collectors/industryTrends.js` 신규
   - fetchIndustryTrends(deps)
   - parseIndustryTrends(body)
   - 상승/하락 업종 상위/하위 3개 추출

3. `collectors/fredMacroIndicators.js` 신규
   - fetchFredMacroIndicators(config, deps)
   - 6개 시리즈 배치 조회
   - API 키 미설정 → status: 'error' 반환

4. `formatters/naverDataRenderer.js` 수정
   - renderMarketList (KOSPI/KOSDAQ 탭)

5. `formatters/fredDataRenderer.js` 신규
   - renderMacroIndicators (지표 테이블 + 미니 차트)

6. `pipeline/generateDashboard.js` 수정
   - 3개 신규 수집기 Promise.all 추가

7. `formatters/dashboardFormatter.js` 수정
   - 3개 카드 호출

8. `test/unit/collectors/naverMarketList.test.js`, `industryTrends.test.js`, `fredMacroIndicators.test.js` 신규

**검증 기준**:
- [ ] npm test 통과
- [ ] 생성된 HTML에 "시가총액 상위 종목", "업종별 등락", "경제 지표" 카드 확인
- [ ] FRED 키 미설정 시 → "FRED 데이터 미설정" 안내문 렌더링
- [ ] FRED 키 설정 시 → 6개 지표 표시 (또는 일부 실패 시 해당 지표만 "-")

**PR 제목**: `feat: 시장 대량 조회, 업종 분석, FRED 거시 지표 카드 추가`

---

### **Phase 5: 뉴스 및 최적화 (2일, PR#5)**

**목표**: 5단계 뉴스/공시 추가 및 프롬프트 확장

**작업**:
1. `collectors/naverNews.js` 신규
   - fetchStockNews(code, {limit}, deps)
   - parseStockNews(body, code)
   - HTML 엔티티 디코딩

2. `collectors/secFiling.js` 신규
   - SEC EDGAR API 통합
   - CIK 매핑 (company_tickers.json 사전 로드)
   - fetchSecFiling(ticker, {limit}, deps)

3. `formatters/naverDataRenderer.js` 수정
   - renderNews (헤드라인 리스트)
   - renderSecFiling (공시 리스트)

4. `pipeline/generateDashboard.js` 수정
   - 2개 신규 수집기 Promise.all 추가

5. `analysis/promptBuilder.js` 수정
   - integrationInfo, chartHistory, industry, macroIndicators, news 요약 추가
   - 프롬프트 구조 재편성 (섹션별 요약)

6. `test/unit/collectors/naverNews.test.js`, `secFiling.test.js` 신규

**검증 기준**:
- [ ] npm test 통과
- [ ] 생성된 HTML에 "뉴스 & 공시" 카드 확인
- [ ] 각 섹션 3~5개 항목 표시
- [ ] Claude 인사이트 프롬프트가 신규 데이터 포함 → 텍스트 길이 검증 (>1000자, <2000자)

**PR 제목**: `feat: 뉴스 및 SEC 공시 카드, Claude 프롬프트 확장`

---

### **최종 검증 (Phase 5 이후)**

**전체 엔드-투-엔드**:
1. 모든 PR 병합 후 main에서 `npm run report:local` 실행
2. dist/index.html 확인:
   - 13개 카드 렌더링 (기존 8개 + 신규 5개)
   - 정보 밀도: 카드당 평균 80줄 이하 (읽기 피로도 OK)
   - 생성 시간: <60초 (타임아웃 마진 충분)

3. GitHub Actions 테스트:
   - 임의의 날에 수동 실행(`Run workflow`)
   - 10분 내 완료, 모든 잡 success
   - 텔레그램 알림 도착, 대시보드 URL 정상 렌더링

---

## 성능 분석

### 호출 시간 추정

| 수집기 | 건수 | 호출당 시간 | 합계 | 비고 |
|---|---|---|---|---|
| usMarket, treasury, vix, fedFunds | 4 | 1~2초 | 2초 (병렬) | AV rate limit 포함 |
| naverMarketScraper (기존) | 1 | 8~15초 | 8초 | Playwright 오버헤드 |
| naverIntegrationQuote | 5 | 0.2초 | 1초 (직렬, minGapMs: 500) | 비공개 API, 500ms 간격 |
| naverChartHistory | 5 | 0.3초 | 1.5초 | EUC-KR 파싱 포함 |
| naverMarketList | 2 | 0.3초 | 0.6초 (병렬) | API 대체 (스크래퍼 제거 시 8초 절감) |
| industryTrends | 1 | 0.2초 | 0.2초 | 단일 API 호출 |
| fredMacroIndicators | 1 | 0.5초 | 0.5초 (또는 skip) | API 키 미설정 시 즉시 반환 |
| naverNews + secFiling | 7 | 0.15초 | 1.05초 (직렬) | 뉴스 5 + 공시 2 |
| Claude 인사이트 생성 | 1 | 3~5초 | 4초 | API 왕복 |
| HTML 포맷팅 | - | - | 0.5초 | 동기 처리 |
| **합계** | - | - | **~19초** | (병렬 최적화 가정) |

**GitHub Actions 타임아웃**: 10분 → 충분한 마진 (19초 << 600초)

**최적화 기회**:
- 3단계 이후: Playwright 스크래퍼 제거 → 8초 절감
- 나중에: naverStockQuote 5회 → naverIntegrationQuote 1회로 통합 → AV 한도 추가 절감

---

## 참고: 기존 코드와의 호환성

### 변경 없이 유지되는 모듈

- src/scrapers/browserFactory.js, foreignFlowScraper.js
- src/notifiers/, src/pipeline/sendDashboardNotification.js
- src/utils/ (기존 함수들)
- test/ (기존 테스트들)

### Deprecate되지만 제거되지 않는 모듈

- src/scrapers/naverMarketScraper.js
  - 3단계 이후에도 폴백용으로 유지
  - generateDashboard.js에서 선택적 사용 (신규 naverMarketList 실패 시)
  - 향후 1개월 뒤 제거 검토

### API 키 추가 요구사항

**신규**: `FRED_API_KEY` (선택, 미설정 시 거시지표 카드만 skip)

**.env.example** 수정 필요:
```
FRED_API_KEY=       # (선택) FRED API 키 — 없으면 거시지표 표시 안 됨
```

---

## 결론

이 설계는 **가장 단순한 구조**로 5개 신규 데이터 소스를 통합한다:
- 각 수집기는 독립적, result envelope로 실패 격리
- 렌더링은 기존 패턴(renderCard, renderStatusCard, renderTable) 재사용
- 프롬프트는 단계적 확장, 토큰 관리
- 단계별 구현으로 위험 분산, 검증 용이

**5단계 완료 후**: 초보자가 "미국 시장 어때?", "한국 종목 어디가 싼가?", "지금 경기는?", "세계 경제는?" 각 질문에 대한 답을 대시보드 한 화면에서 얻을 수 있다.
