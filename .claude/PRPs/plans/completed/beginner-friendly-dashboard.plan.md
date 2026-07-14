# Plan: 초보자 친화적 대시보드 (Beginner-Friendly Dashboard)

## Summary
주식 투자 경험이 전혀 없는 사용자도 대시보드(`dist/index.html`)만 보고 오늘 시장이 어땠는지, 각 지표가 무엇을 의미하는지 이해할 수 있도록 개선한다. 모든 카드에 쉬운 설명(용어 해설)과 상승/하락 해석 라벨을 추가하고, 상단에 "오늘의 요약"과 "읽는 순서" 안내를 넣고, FMP에서 잘 알려진 대형 기업 5곳의 주가를 가져와 "관심 기업" 섹션을 새로 만든다. Claude 인사이트 프롬프트에는 특정 종목 매수/매도 추천을 금지하고 초보자 눈높이로 설명하도록 가드레일을 추가하며, 대시보드/텔레그램 메시지 모두에 "투자 조언이 아닙니다" disclaimer를 명시한다.

## User Story
As a 주식 투자 경험이 없는 개인 사용자,
I want 대시보드의 숫자와 인사이트를 쉬운 말로 이해하고, 어떤 기업들의 주가가 오늘 어떻게 움직였는지 참고할 수 있기를,
So that 매일 아침 리포트를 보고 시장 흐름을 스스로 학습하고 판단할 수 있다 (단, 투자 조언이 아닌 참고 정보로).

## Problem → Solution
**현재**: 대시보드는 5개 카드(미국증시/국내증시/외국인동향/국채금리/Claude 인사이트)에 숫자와 지수만 나열되어, 사전 지식이 없으면 의미를 알 수 없다. 특정 기업 정보도 전혀 없다.
**개선 후**: 각 카드에 "이게 뭔지" 설명과 "지금 수치 해석"(상승/하락 라벨)이 붙고, 상단에 오늘의 전반적 분위기 요약 + 읽는 순서 가이드가 추가되며, 잘 알려진 대형 기업 5곳의 오늘 주가 변동을 보여주는 "관심 기업" 카드가 새로 생긴다. Claude 인사이트는 초보자 눈높이로 설명하되 특정 종목 매수/매도 추천은 하지 않도록 가드레일이 걸리고, 페이지 상단/하단과 인사이트 카드에 투자 조언이 아니라는 disclaimer가 명시된다.

## Metadata
- **Complexity**: Large (파일 수는 많지만 대부분 기존 패턴을 그대로 미러링하는 저위험 변경)
- **Source PRD**: N/A
- **PRD Phase**: N/A
- **Estimated Files**: 18 (8 신규, 10 수정)

---

## UX Design

### Before
```
┌──────────────────────────────────────────┐
│ 📊 2026-07-14 데일리 마켓 리포트           │
│ 생성 시각: ...                             │
│                                            │
│ 🇺🇸 미국 증시                              │
│  S&P 500      500     1.1%                │
│  나스닥        400    -0.5%                │
│  다우존스      380     0.1%                │
│                                            │
│ 🇰🇷 국내 증시   (숫자만)                    │
│ 💱 외국인·기관 동향  (숫자만)                │
│ 💵 10년물 국채금리   (숫자만)                │
│ 🤖 Claude 인사이트  (짧은 문단 1개)          │
└──────────────────────────────────────────┘
초보자는 각 숫자가 좋은 신호인지 나쁜 신호인지,
왜 봐야 하는지 전혀 알 수 없다.
```

### After
```
┌──────────────────────────────────────────────────────┐
│ ⚠️ 이 대시보드는 정보 제공용이며 투자 조언이 아닙니다   │  ← 상단 고정 배너
│                                                        │
│ 📊 2026-07-14 데일리 마켓 리포트                        │
│                                                        │
│ 📌 오늘의 요약                                          │
│  "오늘은 상승한 지수(3개)가 하락한 지수(1개)보다        │
│   많았어요. 전반적으로 좋은 흐름이었어요."               │
│  처음이신가요? 이 순서로 읽어보세요:                    │
│  ①요약 → ②미국·국내 증시 → ③외국인·기관 동향 →        │
│  ④관심 기업 → ⑤AI 인사이트                             │
│                                                        │
│ 🇺🇸 미국 증시                                          │
│  💡 미국의 대표 주가지수 3개예요. (쉬운 설명)            │
│  S&P 500   500   ▲ 상승 (1.1%)                        │
│  나스닥     400   ▼ 하락 (-0.5%)                       │
│  ...                                                  │
│ 🇰🇷 국내 증시 (설명 + 해석 라벨)                        │
│ 💱 외국인·기관 동향 (설명 + 해석 라벨)                   │
│ 💵 10년물 국채금리 (설명 추가)                           │
│                                                        │
│ 🏢 오늘의 관심 기업                                     │
│  💡 잘 알려진 대형 기업들의 오늘 주가 변동이에요.         │
│     매수/매도 추천이 아니라 참고용입니다.                │
│  애플(AAPL)         ▲ 상승 (0.8%)                      │
│  마이크로소프트(MSFT) ▼ 하락 (-0.3%)                    │
│  ...                                                  │
│                                                        │
│ 🤖 AI 인사이트 (초보자용 설명, 매수/매도 언급 없음)       │
│  ※ 참고용 정보이며 투자 조언이 아닙니다.                 │
│                                                        │
│ ⚠️ 투자 조언이 아닙니다 (하단 배너, 반복)               │
└──────────────────────────────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| 대시보드 최초 진입 | 숫자만 나열된 카드 | 상단 disclaimer + 오늘의 요약 + 읽는 순서 안내 | 정적 HTML, JS 인터랙션 없음(툴팁 대신 항상 보이는 텍스트) |
| 각 카드 | 제목 + 숫자 | 제목 + 쉬운 설명(hint) + 해석 라벨(▲/▼/보합) | 접근성 고려해 hover 툴팁 대신 인라인 텍스트 사용 |
| 인사이트 | 자유 텍스트 1문단 | 가드레일 적용된 텍스트 + 고정 disclaimer 캡션 | 특정 종목 매수/매도 언급 금지 |
| 신규 섹션 | 없음 | "오늘의 관심 기업" 카드 (5개 대형주) | FMP 개별 quote 호출, 기존 usMarket과 동일 패턴 |
| 텔레그램 메시지 | 링크 + 상태 라인 | 링크 + 상태 라인 + 짧은 disclaimer 라인 | 기존 캐시 버스터 유지 |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `src/formatters/dashboardFormatter.js` | 1-175 (전체) | 현재 렌더링 구조, escapeHtml/changeClass, no-cache meta 태그 위치 — 그대로 유지해야 함 |
| P0 | `src/collectors/usMarketCollector.js` | 1-34 (전체) | 신규 `watchlistCollector.js`가 그대로 미러링할 FMP 개별 quote 패턴 |
| P0 | `src/utils/resultEnvelope.js` | 1-14 (전체) | 모든 수집기/카드가 따르는 `{status, source, data/error, fetchedAt}` 표준 |
| P0 | `src/pipeline/generateDashboard.js` | 1-81 (전체) | `Promise.all`로 병렬 수집 후 `sections` 조립 → 인사이트 → HTML/메시지 생성 흐름. 여기에 watchlist를 끼워 넣어야 함 |
| P1 | `src/analysis/promptBuilder.js` | 1-30 (전체) | 가드레일을 추가할 프롬프트 생성 로직 |
| P1 | `src/config/constants.js` | 1-52 (전체) | `US_INDEX_TICKERS`와 동일한 형태로 `WATCHLIST_TICKERS` 추가 |
| P1 | `src/formatters/telegramLinkFormatter.js` | 1-31 (전체) | disclaimer 라인 추가 위치, 기존 캐시 버스터 로직 유지 |
| P2 | `test/unit/collectors/usMarketCollector.test.js` | 전체 | 신규 `watchlistCollector.test.js`가 그대로 따라야 할 테스트 구조 (`QUOTES_BY_SYMBOL` 맵 패턴) |
| P2 | `test/unit/formatters/dashboardFormatter.test.js` | 전체 | 기존 검증 항목(escapeHtml, no-cache 태그, XSS 이스케이프) 중 이관/유지해야 할 것 파악 |
| P2 | `test/unit/pipeline/generateDashboard.test.js` | 전체 | `buildDeps()` 헬퍼에 `collectWatchlistFn` mock을 추가해야 실제 네트워크 호출 없이 테스트 통과 |

## External Documentation
No external research needed — feature uses established internal patterns (FMP `/stable/quote` 개별 호출은 `usMarketCollector.js`에서 이미 검증된 패턴을 그대로 재사용하므로 신규 API 리서치가 필요 없음).

---

## Patterns to Mirror

### NAMING_CONVENTION (수집기)
```js
// SOURCE: src/collectors/usMarketCollector.js:1-33
const { fetchFmp } = require('./fmpClient');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { US_INDEX_TICKERS } = require('../config/constants');

const SOURCE = 'fmp-us-market';

async function fetchIndexQuote(ticker, config, deps) {
  const quotes = await deps.fetchFmp('/quote', { symbol: ticker.symbol }, { apiKey: config.fmpApiKey });
  const quote = Array.isArray(quotes) ? quotes[0] : null;
  return {
    label: ticker.label,
    symbol: ticker.symbol,
    price: quote ? quote.price : null,
    changesPercentage: quote ? quote.changePercentage : null,
  };
}

async function collectUsMarket(config, deps = { fetchFmp }) {
  return withResultEnvelope(SOURCE, 'US market collection failed', async () => {
    const indices = await Promise.all(US_INDEX_TICKERS.map((t) => fetchIndexQuote(t, config, deps)));
    return { indices };
  });
}
```
새 `watchlistCollector.js`는 함수명(`fetchCompanyQuote`/`collectWatchlist`)과 반환 필드(`companies` 배열)만 바꿔 이 구조를 그대로 따른다.

### ERROR_HANDLING (모든 수집기 공통)
```js
// SOURCE: src/utils/resultEnvelope.js:1-13
async function withResultEnvelope(source, failureMessage, fn) {
  try {
    const data = await fn();
    return { status: 'ok', source, data, fetchedAt: new Date().toISOString() };
  } catch (err) {
    logger.error(failureMessage, { error: err.message });
    return { status: 'error', source, error: err.message, fetchedAt: new Date().toISOString() };
  }
}
```
`watchlistCollector.js`는 이 헬퍼를 그대로 사용한다 (신규 에러 처리 로직 작성 금지 — 이미 있는 것 재사용).

### DASHBOARD_STATUS_CARD (현재 dashboardFormatter.js 내부, 분리 대상)
```js
// SOURCE: src/formatters/dashboardFormatter.js:17-30
function renderStatusCard(title, section, renderBody) {
  if (!section || section.status !== 'ok') {
    return `
      <section class="card">
        <h2>${escapeHtml(title)}</h2>
        <p class="warning">⚠️ 데이터를 가져오지 못했습니다.</p>
      </section>`;
  }
  return `
      <section class="card">
        <h2>${escapeHtml(title)}</h2>
        ${renderBody(section.data)}
      </section>`;
}
```
이 함수를 `dashboardSections.js`로 옮기면서 `hint`(용어 설명) 파라미터를 추가한 `renderCard`/`renderStatusCard`로 확장한다 (아래 Task 3 참고).

### PIPELINE_PARALLEL_COLLECTION
```js
// SOURCE: src/pipeline/generateDashboard.js:47-59
const [usMarket, treasury, krData] = await Promise.all([
  collectUsMarketFn(config),
  collectTreasuryYieldFn(config),
  collectKrDataFn(),
]);

const sections = {
  usMarket,
  treasury,
  krMarket: krData.krMarket,
  foreignFlow: krData.foreignFlow,
};
```
`collectWatchlistFn(config)`를 같은 `Promise.all` 배열에 추가하고, `sections`에 `watchlist` 필드를 추가한다.

### TEST_STRUCTURE (수집기 단위 테스트)
```js
// SOURCE: test/unit/collectors/usMarketCollector.test.js:1-26
const QUOTES_BY_SYMBOL = {
  '^GSPC': { symbol: '^GSPC', price: 500, changePercentage: 1.2 },
  // ...
};

test('returns ok status with mapped indices on success', async () => {
  const fakeFetchFmp = async (path, params) => {
    const quote = QUOTES_BY_SYMBOL[params.symbol];
    return quote ? [quote] : [];
  };
  const result = await collectUsMarket(config, { fetchFmp: fakeFetchFmp });
  assert.equal(result.status, 'ok');
  // ...
});
```
`watchlistCollector.test.js`는 심볼만 `AAPL`/`MSFT`/`NVDA`/`AMZN`/`GOOGL`로 바꿔 동일한 3개 테스트 케이스(성공/실패/일부 누락)를 작성한다.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `src/utils/htmlEscape.js` | CREATE | `escapeHtml`/`changeClass`/`changeLabel`(신규)을 공용 유틸로 추출 — `dashboardFormatter.js`와 신규 `dashboardSections.js` 양쪽에서 순환 의존성 없이 재사용하기 위함 |
| `src/formatters/glossary.js` | CREATE | 카드별 초보자용 용어 설명 텍스트를 데이터로 분리 (DRY, 텍스트 수정 시 한 곳만 변경) |
| `src/formatters/dashboardSections.js` | CREATE | `dashboardFormatter.js`가 800줄 제한에 근접하지 않도록 카드별 렌더 함수(요약/미국증시/국내증시/외국인동향/국채금리/관심기업/인사이트/disclaimer)를 분리 |
| `src/collectors/watchlistCollector.js` | CREATE | 대형 기업 5곳의 FMP 개별 quote를 가져오는 신규 수집기 (usMarketCollector.js 패턴 그대로 미러링) |
| `src/config/constants.js` | UPDATE | `WATCHLIST_TICKERS` 상수 추가 |
| `src/analysis/promptBuilder.js` | UPDATE | 초보자 눈높이 설명 + 매수/매도 추천 금지 가드레일 규칙 추가, `watchlist` 섹션을 프롬프트에 포함 |
| `src/pipeline/generateDashboard.js` | UPDATE | `collectWatchlistFn`을 병렬 수집에 추가하고 `sections.watchlist` 연결 |
| `src/formatters/dashboardFormatter.js` | UPDATE | 카드 렌더링 로직을 `dashboardSections.js`로 위임하는 얇은 셸로 축소, disclaimer 배너 상/하단 추가, 관련 CSS 클래스(`.hint`, `.disclaimer`, `.summary`) 추가, `escapeHtml` re-export 제거 |
| `src/formatters/telegramLinkFormatter.js` | UPDATE | 메시지 하단에 짧은 disclaimer 라인 추가 |
| `README.md` | UPDATE | "대시보드 섹션 구성" 설명에 관심 기업 카드와 disclaimer 정책 반영 (경미한 문서 수정) |
| `test/unit/utils/htmlEscape.test.js` | CREATE | 이관된 `escapeHtml` 테스트 + 신규 `changeClass`/`changeLabel` 테스트 |
| `test/unit/formatters/glossary.test.js` | CREATE | 각 섹션 키에 대한 설명 문자열이 존재하는지 검증 |
| `test/unit/formatters/dashboardSections.test.js` | CREATE | 카드별 렌더 함수의 ok/error 상태, disclaimer, 요약 로직(상승 우세/하락 우세/동률/데이터 없음) 검증 |
| `test/unit/collectors/watchlistCollector.test.js` | CREATE | `usMarketCollector.test.js`와 동일 구조의 성공/실패/일부 누락 테스트 |
| `test/unit/analysis/promptBuilder.test.js` | UPDATE | 가드레일 문구(매수/매도 추천 금지 규칙 텍스트) 포함 여부 검증 추가 |
| `test/unit/pipeline/generateDashboard.test.js` | UPDATE | `buildDeps()`에 `collectWatchlistFn` mock 추가 (실제 네트워크 호출 방지) |
| `test/unit/formatters/dashboardFormatter.test.js` | UPDATE | `escapeHtml` 관련 테스트 제거(→ htmlEscape.test.js로 이관), disclaimer/요약/관심기업 카드 포함 여부에 대한 스모크 테스트 추가 |
| `test/unit/formatters/telegramLinkFormatter.test.js` | UPDATE | disclaimer 라인 존재 검증 추가 |

## NOT Building
- 개인화된 매수/매도 추천, 목표가, 포트폴리오 관리 기능 (라이선스 문제로 명시적 제외)
- 사용자별 관심 종목 커스터마이징 (watchlist는 코드에 하드코딩된 5개 고정 리스트 — 향후 별도 기능으로 분리 가능)
- 시장 전체 상승률/하락률 상위 종목 스캔(FMP `biggest-gainers`/`biggest-losers` 등 신규 엔드포인트) — 무료 티어 프리미엄 게이팅 위험이 있고, 이미 검증된 개별 `/quote` 패턴으로 목적을 달성할 수 있으므로 채택하지 않음
- 과거 리포트 히스토리/아카이브 (이전 대화에서 이미 "최신 1건만" 유지로 결정됨)
- 대시보드 내 JS 기반 인터랙션(호버 툴팁, 필터, 정렬) — 정적 HTML 유지, 접근성을 위해 항상 보이는 텍스트로 설명
- 다국어 지원 (한국어 전용 유지)
- Alpha Vantage/FMP 외 신규 데이터 제공자 추가

---

## Step-by-Step Tasks

### Task 1: 공용 HTML 유틸 추출 (`src/utils/htmlEscape.js`)
- **ACTION**: `dashboardFormatter.js`의 `escapeHtml`/`changeClass`를 새 파일로 이동하고, 상승/하락/보합을 사람이 읽을 라벨로 바꾸는 `changeLabel` 함수를 추가한다.
- **IMPLEMENT**:
  ```js
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function changeClass(value) {
    if (value == null) return '';
    const numeric = Number(String(value).replace(/,/g, ''));
    if (Number.isNaN(numeric)) return '';
    return numeric > 0 ? 'up' : numeric < 0 ? 'down' : '';
  }

  function changeLabel(value) {
    if (value == null) return '데이터 없음';
    const numeric = Number(String(value).replace(/,/g, ''));
    if (Number.isNaN(numeric)) return '데이터 없음';
    if (numeric > 0) return '▲ 상승';
    if (numeric < 0) return '▼ 하락';
    return '보합(변동 없음)';
  }

  module.exports = { escapeHtml, changeClass, changeLabel };
  ```
- **MIRROR**: `src/formatters/dashboardFormatter.js:1-15` (기존 escapeHtml/changeClass 구현 그대로 이동, 로직 변경 없음)
- **IMPORTS**: 없음 (외부 의존성 없는 순수 함수)
- **GOTCHA**: `changeClass`/`changeLabel`은 쉼표가 포함된 문자열(`"1,234"`)도 처리해야 하므로 기존처럼 `replace(/,/g, '')` 유지
- **VALIDATE**: `node --check src/utils/htmlEscape.js`

### Task 2: 용어 해설 데이터 (`src/formatters/glossary.js`)
- **ACTION**: 각 카드에 붙일 초보자용 한 줄 설명을 데이터로 정의한다.
- **IMPLEMENT**:
  ```js
  const GLOSSARY = Object.freeze({
    usMarket:
      '미국의 대표 주가지수 3개예요. S&P 500과 나스닥은 미국 대형 기업들의 평균적인 주가 흐름을, 다우존스는 오래된 우량 기업 30곳의 흐름을 보여줘요. 지수가 오르면 전반적으로 주가가 오른 날이라고 이해하면 돼요.',
    krMarket:
      '코스피는 한국 대형 기업들의 주가를 모아놓은 지수, 코스닥은 중소·벤처기업 중심의 지수예요. 두 지수가 함께 오르면 국내 증시 전반이 좋았던 날이에요.',
    foreignFlow:
      '외국인·기관 투자자가 이날 국내 주식을 순수하게 더 많이 샀는지(+) 팔았는지(-)를 보여줘요. 외국인 순매수가 크면 해외 투자자들이 한국 시장을 긍정적으로 본다는 신호로 흔히 해석돼요.',
    treasury:
      '미국 정부가 10년 동안 돈을 빌리면서 지급하는 이자율이에요. 이 금리가 오르면 주식 같은 위험자산의 매력이 상대적으로 줄어드는 경향이 있고, 내리면 반대 경향이 있어요.',
    watchlist:
      '전 세계적으로 잘 알려진 대형 기업들의 오늘 주가 변동이에요. 특정 종목을 사고팔라는 뜻이 아니라, 시장 분위기를 가늠하는 참고 자료로만 봐주세요.',
  });

  module.exports = { GLOSSARY };
  ```
- **MIRROR**: `src/config/constants.js` (Object.freeze로 불변 상수 정의하는 스타일)
- **IMPORTS**: 없음
- **GOTCHA**: 텍스트에 `<`, `>`, `&` 같은 HTML 특수문자를 넣지 않는다 (렌더링 시 `escapeHtml`을 거치므로 그대로 써도 안전하지만 가독성을 위해 피한다)
- **VALIDATE**: `node --check src/formatters/glossary.js`

### Task 3: 대형 기업 관심 종목 상수 추가 (`src/config/constants.js`)
- **ACTION**: `US_INDEX_TICKERS`와 동일한 형태로 `WATCHLIST_TICKERS`를 추가한다.
- **IMPLEMENT**:
  ```js
  // 개별 /stable/quote 호출로 조회 가능함이 이미 검증된 대형 기술기업 5곳 (usMarketCollector와 동일 패턴)
  const WATCHLIST_TICKERS = Object.freeze([
    { symbol: 'AAPL', label: '애플' },
    { symbol: 'MSFT', label: '마이크로소프트' },
    { symbol: 'NVDA', label: '엔비디아' },
    { symbol: 'AMZN', label: '아마존' },
    { symbol: 'GOOGL', label: '알파벳(구글)' },
  ]);
  ```
  `module.exports`에 `WATCHLIST_TICKERS` 추가.
- **MIRROR**: `src/config/constants.js:1-7` (`US_INDEX_TICKERS` 정의부)
- **IMPORTS**: 없음
- **GOTCHA**: FMP 무료 티어에서 ETF/배치 조회가 프리미엄으로 막혀 있었던 이력이 있으므로(README 참고), 반드시 **개별 심볼**을 하나씩 조회하는 방식(Task 4)을 유지해야 한다. 배치(`AAPL,MSFT,...`) 호출로 바꾸지 말 것.
- **VALIDATE**: `node --check src/config/constants.js`

### Task 4: 관심 기업 수집기 (`src/collectors/watchlistCollector.js`)
- **ACTION**: `WATCHLIST_TICKERS`를 개별 FMP `/quote` 호출로 조회하는 수집기를 만든다.
- **IMPLEMENT**:
  ```js
  const { fetchFmp } = require('./fmpClient');
  const { withResultEnvelope } = require('../utils/resultEnvelope');
  const { WATCHLIST_TICKERS } = require('../config/constants');

  const SOURCE = 'fmp-watchlist';

  async function fetchCompanyQuote(ticker, config, deps) {
    const quotes = await deps.fetchFmp(
      '/quote',
      { symbol: ticker.symbol },
      { apiKey: config.fmpApiKey },
    );
    const quote = Array.isArray(quotes) ? quotes[0] : null;

    return {
      label: ticker.label,
      symbol: ticker.symbol,
      price: quote ? quote.price : null,
      changesPercentage: quote ? quote.changePercentage : null,
    };
  }

  async function collectWatchlist(config, deps = { fetchFmp }) {
    return withResultEnvelope(SOURCE, 'Watchlist collection failed', async () => {
      const companies = await Promise.all(
        WATCHLIST_TICKERS.map((ticker) => fetchCompanyQuote(ticker, config, deps)),
      );
      return { companies };
    });
  }

  module.exports = { collectWatchlist };
  ```
- **MIRROR**: `src/collectors/usMarketCollector.js:1-33` (구조 100% 동일, 필드명만 `indices`→`companies`)
- **IMPORTS**: `./fmpClient`, `../utils/resultEnvelope`, `../config/constants`
- **GOTCHA**: `quote.changePercentage`(stable API 필드명, `changesPercentage` 아님)를 사용해야 한다 — `usMarketCollector.js`에서 이미 겪은 필드명 이슈와 동일
- **VALIDATE**: `node --check src/collectors/watchlistCollector.js`, 이후 Task 12의 단위 테스트로 검증

### Task 5: Claude 인사이트 프롬프트 가드레일 추가 (`src/analysis/promptBuilder.js`)
- **ACTION**: 초보자 눈높이 설명 + 매수/매도 추천 금지 규칙을 프롬프트에 추가하고, `watchlist` 섹션도 설명 목록에 포함한다.
- **IMPLEMENT**:
  ```js
  function buildInsightPrompt(sections) {
    const lines = [
      describeSection('미국 증시', sections.usMarket),
      describeSection('국내 증시', sections.krMarket),
      describeSection('외국인·기관 동향', sections.foreignFlow),
      describeSection('10년물 국채금리', sections.treasury),
      describeSection('관심 기업 동향', sections.watchlist),
    ];

    return [
      '아래는 오늘 수집된 시장 데이터다. 주식 투자를 처음 시작하는 초보자도 이해할 수 있도록',
      '쉬운 말로 4~6문장 분량의 인사이트를 한국어로 작성해줘.',
      '반드시 지켜야 할 규칙:',
      '1. 숫자를 임의로 지어내지 말고 주어진 데이터만 근거로 해석할 것.',
      '2. 특정 종목이나 지수에 대해 "사라", "팔아라", "매수/매도 추천" 등 투자 행동을 지시하는 표현은 절대 쓰지 말 것.',
      '3. 전문 용어(코스피, 순매수, 국채금리 등)를 쓸 때는 짧게 풀어서 설명할 것.',
      '4. 먼저 오늘 시장이 전반적으로 상승/하락/혼조 중 어떤 분위기였는지 요약하고, 그다음 눈에 띄는 부분을 설명할 것.',
      '5. 마지막 문장은 반드시 "이는 참고용 정보이며 투자 판단과 책임은 본인에게 있습니다."로 마무리할 것.',
      '데이터가 없는 항목은 언급하지 않아도 된다.',
      '',
      ...lines,
    ].join('\n');
  }
  ```
- **MIRROR**: `src/analysis/promptBuilder.js:12-27` (기존 함수 구조 유지, 규칙 목록만 확장)
- **IMPORTS**: 없음 (기존 그대로)
- **GOTCHA**: `hasUsableData`는 수정하지 않는다 — 이미 `Object.values(sections).some(...)`로 제네릭하게 동작하므로 `watchlist`가 추가돼도 자동으로 처리됨
- **VALIDATE**: `node --check src/analysis/promptBuilder.js`, Task 13의 테스트로 가드레일 문구 존재 검증

### Task 6: 파이프라인에 관심 기업 수집 연결 (`src/pipeline/generateDashboard.js`)
- **ACTION**: `collectWatchlist`를 병렬 수집 목록에 추가하고 `sections.watchlist`로 연결한다.
- **IMPLEMENT**:
  ```js
  const { collectWatchlist } = require('../collectors/watchlistCollector');
  // ... 기존 import 유지 ...

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

      // 이하 기존 로직(인사이트 생성 → HTML/메시지 생성 → 파일 쓰기) 동일하게 유지
      ...
    } catch (err) {
      ...
    }
  }
  ```
- **MIRROR**: `src/pipeline/generateDashboard.js:47-59` (병렬 수집 + sections 조립 패턴)
- **IMPORTS**: `../collectors/watchlistCollector`
- **GOTCHA**: `Promise.all` 배열 순서와 구조분해 변수 순서(`usMarket, treasury, krData, watchlist`)를 정확히 맞출 것 — 순서가 틀리면 잘못된 데이터가 잘못된 필드에 들어감
- **VALIDATE**: `node --check src/pipeline/generateDashboard.js`, Task 14의 테스트로 검증

### Task 7: 대시보드 카드 렌더러 분리 (`src/formatters/dashboardSections.js`)
- **ACTION**: `dashboardFormatter.js`에 있던 카드별 렌더 로직을 이 새 파일로 옮기고, 용어 설명(hint)·해석 라벨·관심 기업 카드·disclaimer·요약 카드를 추가한다.
- **IMPLEMENT**:
  ```js
  const { escapeHtml, changeClass, changeLabel } = require('../utils/htmlEscape');
  const { GLOSSARY } = require('./glossary');

  function renderCard(title, hint, bodyHtml) {
    return `
        <section class="card">
          <h2>${escapeHtml(title)}</h2>
          <p class="hint">${escapeHtml(hint)}</p>
          ${bodyHtml}
        </section>`;
  }

  function renderStatusCard(title, hint, section, renderBody) {
    if (!section || section.status !== 'ok') {
      return renderCard(title, hint, '<p class="warning">⚠️ 데이터를 가져오지 못했습니다.</p>');
    }
    return renderCard(title, hint, renderBody(section.data));
  }

  function renderDisclaimer() {
    return `
        <div class="disclaimer">
          ⚠️ 이 대시보드는 정보 제공을 목적으로 하며 투자 조언이 아닙니다. 모든 투자 판단과 책임은 본인에게 있습니다.
        </div>`;
  }

  function countUpDown(values) {
    return values.reduce(
      (acc, value) => {
        const cls = changeClass(value);
        if (cls === 'up') return { ...acc, up: acc.up + 1 };
        if (cls === 'down') return { ...acc, down: acc.down + 1 };
        return acc;
      },
      { up: 0, down: 0 },
    );
  }

  function renderSummary(sections) {
    const values = [];
    if (sections.usMarket?.status === 'ok') {
      values.push(...sections.usMarket.data.indices.map((i) => i.changesPercentage));
    }
    if (sections.krMarket?.status === 'ok') {
      values.push(sections.krMarket.data.kospi.change, sections.krMarket.data.kosdaq.change);
    }

    const { up, down } = countUpDown(values);
    let mood = '오늘 수집된 지수 데이터가 부족해 전반적인 분위기를 요약하기 어려워요.';
    if (up > down) mood = `오늘은 상승한 지수(${up}개)가 하락한 지수(${down}개)보다 많았어요. 전반적으로 좋은 흐름이었어요.`;
    else if (down > up) mood = `오늘은 하락한 지수(${down}개)가 상승한 지수(${up}개)보다 많았어요. 전반적으로 조심스러운 흐름이었어요.`;
    else if (up + down > 0) mood = '오늘은 상승과 하락이 비슷하게 나타난, 방향성이 뚜렷하지 않은 날이었어요.';

    return `
        <section class="card summary">
          <h2>📌 오늘의 요약</h2>
          <p>${escapeHtml(mood)}</p>
          <p class="hint">처음이신가요? 이 순서로 읽어보세요: ① 오늘의 요약 → ② 미국·국내 증시 → ③ 외국인·기관 동향 → ④ 관심 기업 → ⑤ AI 인사이트</p>
        </section>`;
  }

  function renderUsMarket(section) {
    return renderStatusCard('🇺🇸 미국 증시', GLOSSARY.usMarket, section, (data) => `
          <ul class="index-list">
            ${data.indices
              .map(
                (index) => `
            <li>
              <span class="label">${escapeHtml(index.label)}</span>
              <span class="value">${index.price != null ? escapeHtml(index.price) : '데이터 없음'}</span>
              <span class="change ${changeClass(index.changesPercentage)}">
                ${escapeHtml(changeLabel(index.changesPercentage))}
                ${index.changesPercentage != null ? `(${escapeHtml(index.changesPercentage)}%)` : ''}
              </span>
            </li>`,
              )
              .join('')}
          </ul>`);
  }

  function renderKrMarket(section) {
    return renderStatusCard('🇰🇷 국내 증시', GLOSSARY.krMarket, section, (data) => `
          <ul class="index-list">
            <li>
              <span class="label">코스피</span>
              <span class="value">${escapeHtml(data.kospi.value)}</span>
              <span class="change ${changeClass(data.kospi.change)}">${escapeHtml(changeLabel(data.kospi.change))} (${escapeHtml(data.kospi.change)})</span>
            </li>
            <li>
              <span class="label">코스닥</span>
              <span class="value">${escapeHtml(data.kosdaq.value)}</span>
              <span class="change ${changeClass(data.kosdaq.change)}">${escapeHtml(changeLabel(data.kosdaq.change))} (${escapeHtml(data.kosdaq.change)})</span>
            </li>
          </ul>`);
  }

  function renderForeignFlow(section) {
    return renderStatusCard('💱 외국인·기관 동향', GLOSSARY.foreignFlow, section, (data) => `
          <ul class="index-list">
            <li>
              <span class="label">외국인 순매수</span>
              <span class="value ${changeClass(data.foreignNetBuy)}">${data.foreignNetBuy ? escapeHtml(data.foreignNetBuy) : '데이터 없음'}</span>
            </li>
            <li>
              <span class="label">기관 순매수</span>
              <span class="value ${changeClass(data.institutionNetBuy)}">${data.institutionNetBuy ? escapeHtml(data.institutionNetBuy) : '데이터 없음'}</span>
            </li>
          </ul>`);
  }

  function renderTreasury(section) {
    return renderStatusCard('💵 10년물 국채금리', GLOSSARY.treasury, section, (data) => `
          <p class="treasury-value">${data.yieldPercent != null ? `${escapeHtml(data.yieldPercent)}%` : '데이터 없음'}</p>
          <p class="treasury-date">${data.date ? escapeHtml(data.date) : ''}</p>`);
  }

  function renderWatchlist(section) {
    return renderStatusCard('🏢 오늘의 관심 기업', GLOSSARY.watchlist, section, (data) => `
          <ul class="index-list">
            ${data.companies
              .map(
                (company) => `
            <li>
              <span class="label">${escapeHtml(company.label)} (${escapeHtml(company.symbol)})</span>
              <span class="value">${company.price != null ? escapeHtml(company.price) : '데이터 없음'}</span>
              <span class="change ${changeClass(company.changesPercentage)}">
                ${escapeHtml(changeLabel(company.changesPercentage))}
                ${company.changesPercentage != null ? `(${escapeHtml(company.changesPercentage)}%)` : ''}
              </span>
            </li>`,
              )
              .join('')}
          </ul>`);
  }

  function renderInsight(section) {
    if (!section || section.status !== 'ok') {
      return `
        <section class="card insight">
          <h2>🤖 AI 인사이트</h2>
          <p class="warning">⚠️ 인사이트를 생성하지 못했습니다.</p>
        </section>`;
    }
    return `
        <section class="card insight">
          <h2>🤖 AI 인사이트</h2>
          <p>${escapeHtml(section.data.text)}</p>
          <p class="hint">※ 위 내용은 데이터 기반 참고 정보이며 투자 조언이 아닙니다.</p>
        </section>`;
  }

  module.exports = {
    renderDisclaimer,
    renderSummary,
    renderUsMarket,
    renderKrMarket,
    renderForeignFlow,
    renderTreasury,
    renderWatchlist,
    renderInsight,
  };
  ```
- **MIRROR**: `src/formatters/dashboardFormatter.js:17-103` (기존 5개 렌더 함수 로직을 그대로 옮기되 hint/라벨/신규 카드 추가)
- **IMPORTS**: `../utils/htmlEscape`, `./glossary`
- **GOTCHA**: 옵셔널 체이닝(`sections.usMarket?.status`)은 Node 20+에서 지원되지만, 프로젝트 전체에서 옵셔널 체이닝을 쓴 선례가 없으므로(`data.kospi?.value` 같은 패턴 없음) 대신 `sections.usMarket && sections.usMarket.status === 'ok'`처럼 명시적으로 써서 기존 코드 스타일과 통일할 것
- **VALIDATE**: `node --check src/formatters/dashboardSections.js`, Task 15의 테스트로 검증

### Task 8: 대시보드 셸 축소 (`src/formatters/dashboardFormatter.js`)
- **ACTION**: 카드 렌더링을 `dashboardSections.js`에 위임하고, disclaimer 배너를 상/하단에 추가하며 관련 CSS를 보강한다. `escapeHtml` re-export는 제거한다(더 이상 이 파일의 책임이 아님).
- **IMPLEMENT**:
  ```js
  const { escapeHtml } = require('../utils/htmlEscape');
  const {
    renderDisclaimer,
    renderSummary,
    renderUsMarket,
    renderKrMarket,
    renderForeignFlow,
    renderTreasury,
    renderWatchlist,
    renderInsight,
  } = require('./dashboardSections');

  function formatDashboardHtml(sections) {
    const today = new Date().toISOString().slice(0, 10);
    const generatedAt = new Date().toISOString();

    return `<!doctype html>
  <html lang="ko">
  <head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>${escapeHtml(today)} 데일리 마켓 리포트</title>
  <style>
    /* 기존 스타일 유지 + 아래 클래스 추가 */
    .hint { color: #8a8f98; font-size: 0.85rem; margin: 0 0 0.75rem; line-height: 1.5; }
    .disclaimer {
      background: #2a1f0f; border: 1px solid #6b4e16; color: #fbbf24;
      border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.9rem;
    }
    .summary p:first-of-type { font-size: 1.05rem; font-weight: 600; }
    /* ... 기존 .card, .index-list 등 스타일 그대로 유지 ... */
  </style>
  </head>
  <body>
  <main>
    ${renderDisclaimer()}
    <h1>📊 ${escapeHtml(today)} 데일리 마켓 리포트</h1>
    <p class="generated-at">생성 시각: ${escapeHtml(generatedAt)}</p>
    ${renderSummary(sections)}
    ${renderUsMarket(sections.usMarket)}
    ${renderKrMarket(sections.krMarket)}
    ${renderForeignFlow(sections.foreignFlow)}
    ${renderTreasury(sections.treasury)}
    ${renderWatchlist(sections.watchlist)}
    ${renderInsight(sections.insight)}
    ${renderDisclaimer()}
  </main>
  </body>
  </html>
  `;
  }

  module.exports = { formatDashboardHtml };
  ```
- **MIRROR**: `src/formatters/dashboardFormatter.js:105-175` (head/style/body 골격 그대로 유지, 카드 호출부만 위임 함수로 교체)
- **IMPORTS**: `../utils/htmlEscape`, `./dashboardSections`
- **GOTCHA**: `renderSummary`는 `sections` 전체 객체를 받고, 나머지는 개별 section을 받는다 — 호출부 인자를 헷갈리지 말 것. 기존 no-cache meta 태그 3줄은 절대 삭제하지 말 것(캐시 무효화 버그 재발 방지)
- **VALIDATE**: `node --check src/formatters/dashboardFormatter.js`, Task 17의 테스트로 검증

### Task 9: 텔레그램 메시지에 disclaimer 추가 (`src/formatters/telegramLinkFormatter.js`)
- **ACTION**: 링크와 상태 라인 아래에 짧은 disclaimer 문장을 추가한다.
- **IMPLEMENT**:
  ```js
  function formatDashboardLinkMessage(sections, dashboardUrl) {
    const today = new Date().toISOString().slice(0, 10);
    const failedCount = countFailedSections(sections);
    const statusLine =
      failedCount > 0
        ? `⚠️ 일부 항목(${failedCount}건)을 가져오지 못했습니다. 대시보드에서 확인하세요.`
        : '✅ 모든 데이터가 정상적으로 수집되었습니다.';

    return [
      `📊 ${today} 데일리 마켓 리포트가 준비됐습니다.`,
      '',
      withCacheBuster(dashboardUrl),
      '',
      statusLine,
      '📌 참고용 정보이며 투자 조언이 아닙니다.',
    ].join('\n');
  }
  ```
- **MIRROR**: `src/formatters/telegramLinkFormatter.js:13-28` (배열에 라인 하나만 추가, 나머지 구조 동일)
- **IMPORTS**: 없음 (기존 그대로)
- **GOTCHA**: `withCacheBuster` 호출 위치와 배열 join 순서를 바꾸지 말 것(기존 캐시 무효화 동작 유지)
- **VALIDATE**: `node --check src/formatters/telegramLinkFormatter.js`, Task 18의 테스트로 검증

### Task 10: README 업데이트
- **ACTION**: "대시보드 섹션 구성" 설명에 관심 기업 카드, 오늘의 요약, disclaimer 정책을 반영한다.
- **IMPLEMENT**: 기존 5개 섹션 나열 부분에 "🏢 오늘의 관심 기업(대형주 5곳)"과 "📌 오늘의 요약" 항목 추가, "이 프로젝트는 투자 조언을 제공하지 않으며 참고용 정보만 제공합니다"라는 문구를 명시적으로 추가.
- **MIRROR**: 기존 README의 "대시보드 섹션 구성" 목록 스타일
- **IMPORTS**: N/A
- **GOTCHA**: README는 프로젝트 문서이므로 실제 화면 구성과 반드시 일치시킬 것 (섹션 순서: disclaimer → 요약 → 미국증시 → 국내증시 → 외국인동향 → 국채금리 → 관심기업 → 인사이트 → disclaimer)
- **VALIDATE**: 육안 검토 (문서이므로 자동 검증 없음)

### Task 11: `htmlEscape` 유닛 테스트 (`test/unit/utils/htmlEscape.test.js`)
- **ACTION**: `dashboardFormatter.test.js`에 있던 `escapeHtml` 테스트를 이관하고, `changeClass`/`changeLabel` 테스트를 추가한다.
- **IMPLEMENT**:
  ```js
  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { escapeHtml, changeClass, changeLabel } = require('../../../src/utils/htmlEscape');

  test('escapeHtml escapes html special characters', () => {
    assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  test('changeClass returns up/down/empty based on numeric sign', () => {
    assert.equal(changeClass('1.2'), 'up');
    assert.equal(changeClass('-0.5'), 'down');
    assert.equal(changeClass('0'), '');
    assert.equal(changeClass(null), '');
  });

  test('changeLabel returns a beginner-friendly label', () => {
    assert.equal(changeLabel('1.2'), '▲ 상승');
    assert.equal(changeLabel('-0.5'), '▼ 하락');
    assert.equal(changeLabel('0'), '보합(변동 없음)');
    assert.equal(changeLabel(null), '데이터 없음');
  });
  ```
- **MIRROR**: `test/unit/formatters/dashboardFormatter.test.js:5-7` (기존 escapeHtml 테스트 그대로 복사)
- **IMPORTS**: `node:test`, `node:assert/strict`, `../../../src/utils/htmlEscape`
- **GOTCHA**: 기존 `dashboardFormatter.test.js`에서 이 테스트 케이스를 반드시 제거해야 중복 실행을 피할 수 있음 (Task 17에서 처리)
- **VALIDATE**: `node --test test/unit/utils/htmlEscape.test.js`

### Task 12: `glossary` 유닛 테스트 (`test/unit/formatters/glossary.test.js`)
- **ACTION**: 모든 섹션 키에 대해 비어있지 않은 설명 문자열이 존재하는지 검증한다.
- **IMPLEMENT**:
  ```js
  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { GLOSSARY } = require('../../../src/formatters/glossary');

  test('provides a non-empty explanation for every dashboard section', () => {
    const requiredKeys = ['usMarket', 'krMarket', 'foreignFlow', 'treasury', 'watchlist'];
    requiredKeys.forEach((key) => {
      assert.equal(typeof GLOSSARY[key], 'string');
      assert.ok(GLOSSARY[key].length > 0);
    });
  });
  ```
- **MIRROR**: `test/unit/utils/resultEnvelope.test.js` 스타일의 간단한 데이터 검증 테스트
- **IMPORTS**: `node:test`, `node:assert/strict`, `../../../src/formatters/glossary`
- **GOTCHA**: 없음
- **VALIDATE**: `node --test test/unit/formatters/glossary.test.js`

### Task 13: `watchlistCollector` 유닛 테스트 (`test/unit/collectors/watchlistCollector.test.js`)
- **ACTION**: `usMarketCollector.test.js`와 동일한 구조로 성공/실패/일부 누락 테스트를 작성한다.
- **IMPLEMENT**:
  ```js
  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { collectWatchlist } = require('../../../src/collectors/watchlistCollector');

  const config = { fmpApiKey: 'test-key' };

  const QUOTES_BY_SYMBOL = {
    AAPL: { symbol: 'AAPL', price: 200, changePercentage: 0.8 },
    MSFT: { symbol: 'MSFT', price: 420, changePercentage: -0.3 },
    NVDA: { symbol: 'NVDA', price: 130, changePercentage: 2.1 },
    AMZN: { symbol: 'AMZN', price: 185, changePercentage: 0.4 },
    GOOGL: { symbol: 'GOOGL', price: 175, changePercentage: -0.1 },
  };

  test('returns ok status with mapped companies on success', async () => {
    const fakeFetchFmp = async (path, params) => {
      const quote = QUOTES_BY_SYMBOL[params.symbol];
      return quote ? [quote] : [];
    };

    const result = await collectWatchlist(config, { fetchFmp: fakeFetchFmp });

    assert.equal(result.status, 'ok');
    assert.equal(result.source, 'fmp-watchlist');
    assert.equal(result.data.companies.length, 5);
    assert.equal(result.data.companies[0].price, 200);
    assert.equal(result.data.companies[0].changesPercentage, 0.8);
  });

  test('returns error status without throwing when fetch fails', async () => {
    const fakeFetchFmp = async () => {
      throw new Error('fmp down');
    };

    const result = await collectWatchlist(config, { fetchFmp: fakeFetchFmp });

    assert.equal(result.status, 'error');
    assert.equal(result.error, 'fmp down');
  });

  test('fills null values when a symbol is missing from the response', async () => {
    const fakeFetchFmp = async (path, params) => {
      if (params.symbol === 'AAPL') return [QUOTES_BY_SYMBOL.AAPL];
      return [];
    };

    const result = await collectWatchlist(config, { fetchFmp: fakeFetchFmp });

    const msft = result.data.companies.find((c) => c.symbol === 'MSFT');
    assert.equal(msft.price, null);
  });
  ```
- **MIRROR**: `test/unit/collectors/usMarketCollector.test.js:1-49` (구조 100% 동일)
- **IMPORTS**: `node:test`, `node:assert/strict`, `../../../src/collectors/watchlistCollector`
- **GOTCHA**: 없음
- **VALIDATE**: `node --test test/unit/collectors/watchlistCollector.test.js`

### Task 14: `promptBuilder` 테스트 업데이트
- **ACTION**: 가드레일 문구가 프롬프트에 포함되는지 검증하는 테스트를 추가한다.
- **IMPLEMENT**:
  ```js
  test('buildInsightPrompt forbids buy/sell recommendations and appends the disclaimer instruction', () => {
    const prompt = buildInsightPrompt({ usMarket: { status: 'ok', data: {} } });

    assert.match(prompt, /매수\/매도 추천/);
    assert.match(prompt, /참고용 정보이며 투자 판단과 책임은 본인에게 있습니다/);
  });

  test('buildInsightPrompt includes watchlist data when present', () => {
    const sections = {
      watchlist: { status: 'ok', data: { companies: [{ symbol: 'AAPL', price: 200 }] } },
    };

    const prompt = buildInsightPrompt(sections);

    assert.match(prompt, /AAPL/);
    assert.match(prompt, /관심 기업 동향/);
  });
  ```
  기존 3개 테스트는 그대로 유지 (구조 변화 없음).
- **MIRROR**: `test/unit/analysis/promptBuilder.test.js:1-32` (기존 스타일)
- **IMPORTS**: 기존 import 그대로
- **GOTCHA**: 정규식에서 `/` 문자는 이스케이프 필요 (`매수\/매도`)
- **VALIDATE**: `node --test test/unit/analysis/promptBuilder.test.js`

### Task 15: `generateDashboard` 테스트 업데이트
- **ACTION**: `buildDeps()`에 `collectWatchlistFn` mock을 추가해 실제 네트워크 호출 없이 테스트가 통과하도록 한다.
- **IMPLEMENT**:
  ```js
  function buildDeps(overrides = {}) {
    return {
      collectUsMarketFn: async () => ({ status: 'ok', source: 'fmp', data: { indices: [] } }),
      collectTreasuryYieldFn: async () => ({ status: 'error', source: 'av', error: 'rate limited' }),
      collectKrDataFn: async () => ({
        krMarket: { status: 'error', source: 'naver', error: 'blocked' },
        foreignFlow: { status: 'ok', source: 'naver', data: { foreignNetBuy: '100', institutionNetBuy: '200' } },
      }),
      collectWatchlistFn: async () => ({ status: 'ok', source: 'fmp-watchlist', data: { companies: [] } }),
      generateInsightFn: async () => ({ status: 'ok', source: 'claude', data: { text: 'insight' } }),
      formatDashboardHtmlFn: () => '<html>dashboard</html>',
      formatDashboardLinkMessageFn: () => 'dashboard link message',
      writeDashboardFileFn: async () => {},
      resolveDashboardUrlFn: () => 'https://example.github.io/market-dashboard/',
      ...overrides,
    };
  }
  ```
  기존 2개 테스트(`writes the dashboard html...`, `propagates the error...`)는 그대로 유지 — `buildDeps()`만 바뀌므로 통과함.
- **MIRROR**: `test/unit/pipeline/generateDashboard.test.js:13-32` (기존 `buildDeps` 헬퍼에 항목만 추가)
- **IMPORTS**: 변경 없음
- **GOTCHA**: `collectWatchlistFn`을 mock에 추가하지 않으면 실제 `collectWatchlist`(→ 실제 axios 호출)가 실행되어 테스트가 네트워크에 의존하게 되거나 타임아웃날 수 있음 — 반드시 추가할 것
- **VALIDATE**: `node --test test/unit/pipeline/generateDashboard.test.js`

### Task 16: `dashboardSections` 테스트 (`test/unit/formatters/dashboardSections.test.js`)
- **ACTION**: 각 렌더 함수의 ok/error 상태, disclaimer, 요약 로직(상승 우세/하락 우세/동률/데이터 부족)을 검증한다.
- **IMPLEMENT**:
  ```js
  const test = require('node:test');
  const assert = require('node:assert/strict');
  const {
    renderDisclaimer,
    renderSummary,
    renderUsMarket,
    renderWatchlist,
    renderInsight,
  } = require('../../../src/formatters/dashboardSections');

  test('renderDisclaimer mentions that this is not investment advice', () => {
    assert.match(renderDisclaimer(), /투자 조언이 아닙니다/);
  });

  test('renderSummary reports an upbeat mood when more indices rose than fell', () => {
    const sections = {
      usMarket: { status: 'ok', data: { indices: [{ changesPercentage: 1 }, { changesPercentage: 2 }] } },
      krMarket: { status: 'error' },
    };
    assert.match(renderSummary(sections), /좋은 흐름이었어요/);
  });

  test('renderSummary reports a cautious mood when more indices fell than rose', () => {
    const sections = {
      usMarket: { status: 'ok', data: { indices: [{ changesPercentage: -1 }, { changesPercentage: -2 }] } },
      krMarket: { status: 'error' },
    };
    assert.match(renderSummary(sections), /조심스러운 흐름이었어요/);
  });

  test('renderSummary falls back to a neutral message when no data is available', () => {
    const sections = { usMarket: { status: 'error' }, krMarket: { status: 'error' } };
    assert.match(renderSummary(sections), /요약하기 어려워요/);
  });

  test('renderUsMarket shows a beginner-friendly hint and interpretation label', () => {
    const section = { status: 'ok', data: { indices: [{ label: 'S&P 500', symbol: '^GSPC', price: 500, changesPercentage: 1.2 }] } };
    const html = renderUsMarket(section);
    assert.match(html, /대표 주가지수/);
    assert.match(html, /▲ 상승/);
  });

  test('renderWatchlist never suggests buying or selling a specific company', () => {
    const section = { status: 'ok', data: { companies: [{ label: '애플', symbol: 'AAPL', price: 200, changesPercentage: 0.8 }] } };
    const html = renderWatchlist(section);
    assert.match(html, /애플/);
    assert.ok(!/매수|매도|사세요|파세요/.test(html));
  });

  test('renderInsight appends a fixed disclaimer caption to the AI text', () => {
    const section = { status: 'ok', data: { text: '오늘은 상승 마감했습니다.' } };
    const html = renderInsight(section);
    assert.match(html, /참고용 정보이며 투자 조언이 아닙니다/);
  });
  ```
- **MIRROR**: `test/unit/formatters/dashboardFormatter.test.js` (기존 섹션별 렌더링 검증 스타일)
- **IMPORTS**: `node:test`, `node:assert/strict`, `../../../src/formatters/dashboardSections`
- **GOTCHA**: `renderSummary`는 `sections` 전체 객체를 인자로 받는다는 점을 테스트에서도 정확히 반영할 것 (다른 render 함수는 개별 section을 받음)
- **VALIDATE**: `node --test test/unit/formatters/dashboardSections.test.js`

### Task 17: `dashboardFormatter` 테스트 재작성
- **ACTION**: `escapeHtml` 관련 테스트를 제거(→ Task 11로 이관 완료)하고, 전체 조립 스모크 테스트에 disclaimer/요약/관심기업 카드 포함 여부를 추가한다.
- **IMPLEMENT**:
  ```js
  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { formatDashboardHtml } = require('../../../src/formatters/dashboardFormatter');

  test('formatDashboardHtml includes no-cache meta tags so browsers always fetch fresh content', () => {
    const html = formatDashboardHtml({});
    assert.match(html, /http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/);
  });

  test('formatDashboardHtml includes a top and bottom disclaimer banner', () => {
    const html = formatDashboardHtml({});
    const matches = html.match(/투자 조언이 아닙니다/g) || [];
    assert.equal(matches.length, 2);
  });

  test('formatDashboardHtml renders ok sections with data, including the watchlist card', () => {
    const sections = {
      usMarket: { status: 'ok', data: { indices: [{ label: 'S&P 500 (SPY)', symbol: 'SPY', price: 500, changesPercentage: 1.1 }] } },
      krMarket: { status: 'ok', data: { kospi: { value: '2,650', change: '+10' }, kosdaq: { value: '860', change: '-2' } } },
      foreignFlow: { status: 'ok', data: { foreignNetBuy: '-1,234', institutionNetBuy: '5,678' } },
      treasury: { status: 'ok', data: { date: '2026-07-13', yieldPercent: '4.25' } },
      watchlist: { status: 'ok', data: { companies: [{ label: '애플', symbol: 'AAPL', price: 200, changesPercentage: 0.8 }] } },
      insight: { status: 'ok', data: { text: '오늘은 상승 마감했습니다.' } },
    };

    const html = formatDashboardHtml(sections);

    assert.match(html, /S&amp;P 500/);
    assert.match(html, /2,650/);
    assert.match(html, /-1,234/);
    assert.match(html, /4\.25%/);
    assert.match(html, /애플/);
    assert.match(html, /상승 마감/);
    assert.match(html, /오늘의 요약/);
    assert.match(html, /<!doctype html>/);
  });

  test('formatDashboardHtml shows a warning for every failed section', () => {
    const sections = {
      usMarket: { status: 'error', error: 'timeout' },
      krMarket: { status: 'error', error: 'timeout' },
      foreignFlow: { status: 'error', error: 'timeout' },
      treasury: { status: 'error', error: 'timeout' },
      watchlist: { status: 'error', error: 'timeout' },
      insight: { status: 'error', error: 'skipped' },
    };

    const html = formatDashboardHtml(sections);
    const warningCount = (html.match(/데이터를 가져오지 못했습니다/g) || []).length;

    assert.equal(warningCount, 5);
    assert.match(html, /인사이트를 생성하지 못했습니다/);
  });

  test('formatDashboardHtml escapes potentially unsafe scraped content', () => {
    const sections = {
      krMarket: {
        status: 'ok',
        data: { kospi: { value: '<img src=x onerror=alert(1)>', change: '+10' }, kosdaq: { value: '860', change: '-2' } },
      },
    };

    const html = formatDashboardHtml(sections);

    assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });
  ```
- **MIRROR**: `test/unit/formatters/dashboardFormatter.test.js` (기존 전체 구조, escapeHtml 테스트만 제거)
- **IMPORTS**: 변경 없음
- **GOTCHA**: `formatDashboardHtml({})` 호출 시 `renderSummary`, `renderUsMarket` 등이 `undefined` section을 안전하게 처리해야 함(이미 `!section || section.status !== 'ok'` 가드로 처리됨) — 새로 추가한 `renderWatchlist`도 동일 가드를 따르는지 확인
- **VALIDATE**: `node --test test/unit/formatters/dashboardFormatter.test.js`

### Task 18: `telegramLinkFormatter` 테스트 업데이트
- **ACTION**: disclaimer 라인이 메시지에 포함되는지 검증하는 테스트를 추가한다.
- **IMPLEMENT**:
  ```js
  test('includes a short disclaimer line noting this is not investment advice', () => {
    const sections = { usMarket: { status: 'ok' } };
    const message = formatDashboardLinkMessage(sections, url);
    assert.match(message, /투자 조언이 아닙니다/);
  });
  ```
  기존 3개 테스트는 그대로 유지.
- **MIRROR**: `test/unit/formatters/telegramLinkFormatter.test.js:1-39` (기존 스타일)
- **IMPORTS**: 변경 없음
- **GOTCHA**: 없음
- **VALIDATE**: `node --test test/unit/formatters/telegramLinkFormatter.test.js`

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| `changeClass`/`changeLabel` | 양수/음수/0/null 문자열 | up/down/''/'데이터 없음' 등 정확한 라벨 | Y (null, 쉼표 포함 숫자) |
| `GLOSSARY` 존재 검증 | 5개 키 | 모두 비어있지 않은 문자열 | N |
| `collectWatchlist` 성공 | 5개 심볼 quote mock | `companies` 5개, 필드 매핑 정확 | N |
| `collectWatchlist` 실패 | fetchFmp가 throw | `status: 'error'`, throw 없음 | Y (네트워크 실패) |
| `collectWatchlist` 일부 누락 | 일부 심볼만 응답 | 누락분은 `price: null` | Y (부분 실패) |
| `buildInsightPrompt` 가드레일 | 임의 sections | "매수/매도 추천" 금지 문구, disclaimer 문구 포함 | N |
| `buildInsightPrompt` watchlist 포함 | watchlist ok 섹션 | 프롬프트에 회사 심볼 포함 | Y (watchlist 없음) |
| `generateDashboard` | mock deps (watchlist 포함) | 기존 2개 테스트 그대로 통과 | N (회귀 방지) |
| `renderSummary` | 상승 우세/하락 우세/동률/데이터 없음 | 각각 다른 메시지 | Y (4가지 케이스) |
| `renderWatchlist` | ok 섹션 | 회사명 포함, 매수/매도 문구 없음 | Y (문구 오염 방지) |
| `renderInsight` | ok/error 섹션 | ok일 때 disclaimer 캡션 포함, error일 때 경고 문구 | Y |
| `formatDashboardHtml` 전체 조립 | 전체 ok/전체 error/혼합 | disclaimer 2회, 카드별 경고 5개, XSS 이스케이프 | Y (XSS, 빈 sections) |
| `formatDashboardLinkMessage` | ok/error 섞인 sections | disclaimer 라인 포함, 캐시 버스터 유지 | N (회귀 방지) |

### Edge Cases Checklist
- [x] 모든 섹션 실패 시 (Task 17 "shows a warning for every failed section")
- [x] 빈 `sections` 객체 (`formatDashboardHtml({})`)
- [x] `watchlist` 섹션 누락 시 (기존 pipeline 테스트에 mock 추가로 커버)
- [x] 상승/하락 동률 (`renderSummary` 3번째 테스트)
- [x] XSS 스크립트 삽입 시도 (`<img onerror=...>`)
- [x] 관심 기업 텍스트에 "매수/매도" 문구가 실수로라도 들어가지 않는지 (음성 검증, `renderWatchlist` 테스트)
- [ ] 네트워크 실패 (FMP `/quote` 자체는 기존 `fmpClient.test.js`에서 이미 커버됨 — 중복 불필요)

---

## Validation Commands

### Static Analysis (Lint 대체 — 이 프로젝트는 별도 타입체커/린터 없음)
```bash
npm run lint
```
EXPECT: 모든 `src/**/*.js`, `scripts/**/*.js` 파일이 `node --check` 통과 (신규 파일 4개, 수정 파일 5개 포함)

### Unit Tests
```bash
npm test
```
EXPECT: 기존 48개 + 신규/수정 테스트(약 20개 이상) 전체 통과, 실패 0건

### Full Test Suite
```bash
npm test
```
EXPECT: No regressions — 기존 시나리오(캐시 무효화, no-cache 메타 태그, XSS 이스케이프, 파이프라인 순서 등) 모두 그대로 통과

### Manual Validation
- [ ] 스크래치 스크립트로 `formatDashboardHtml`에 목(mock) sections(모두 ok, 모두 error, 혼합)을 넣어 생성한 HTML을 파일로 저장한 뒤 브라우저에서 열어 육안으로 확인:
  - 상단/하단 disclaimer 배너가 보이는지
  - "오늘의 요약" 카드 문구가 자연스러운지
  - 각 카드 아래 hint 설명이 잘 보이는지
  - "오늘의 관심 기업" 카드에 5개 회사가 표시되는지
  - 인사이트 카드 아래 disclaimer 캡션이 보이는지
- [ ] `npm run report:local` (기존처럼 Playwright 미설치/ANTHROPIC_API_KEY 미해결로 전체 파이프라인은 로컬에서 완전히 돌리기 어려움 — 이는 기존에도 동일했던 제약이므로, 유닛 테스트 + 위 스크래치 스크립트 육안 확인으로 충분함을 확인)

---

## Acceptance Criteria
- [ ] 18개 파일(8 신규, 10 수정) 모두 반영됨
- [ ] `npm run lint`, `npm test` 통과 (0 실패)
- [ ] 대시보드에 disclaimer(상/하단), 오늘의 요약, 카드별 hint 설명, 해석 라벨(▲/▼/보합), 관심 기업 카드가 모두 렌더링됨
- [ ] Claude 인사이트 프롬프트에 매수/매도 추천 금지 규칙과 마지막 disclaimer 문장 지침이 포함됨
- [ ] 텔레그램 메시지에도 disclaimer 라인이 포함됨
- [ ] `dashboardFormatter.js`, `dashboardSections.js` 모두 800줄 이내 (실측 예상: 각각 150줄, 250줄 내외)
- [ ] 순환 의존성 없음 (`dashboardFormatter.js` → `dashboardSections.js` → `utils/htmlEscape.js`, `formatters/glossary.js` — 단방향)

## Completion Checklist
- [ ] Code follows discovered patterns (수집기는 `usMarketCollector.js` 패턴 100% 미러링)
- [ ] Error handling matches codebase style (`withResultEnvelope`만 사용, 신규 에러 처리 로직 없음)
- [ ] Logging follows codebase conventions (신규 수집기도 `withResultEnvelope` 내부 `logger.error` 그대로 사용)
- [ ] Tests follow test patterns (`node:test` + `node:assert/strict`, mock을 통한 의존성 주입)
- [ ] No hardcoded values beyond의 `WATCHLIST_TICKERS` 같은 상수(기존 `US_INDEX_TICKERS`와 동일 위치·패턴)
- [ ] Documentation updated (README 섹션 구성 반영)
- [ ] No unnecessary scope additions (매수/매도 추천, 커스텀 관심종목, 신규 API 제공자 등은 명시적으로 배제)
- [ ] Self-contained — no questions needed during implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FMP 무료 티어 API 호출 한도 초과 | Low | Low | 기존 3회(지수) + 신규 5회(관심기업) = 실행당 8회, 하루 250회 한도 대비 충분한 여유 |
| Claude가 가드레일에도 불구하고 종목 매수/매도처럼 들리는 문구를 생성 | Medium | Medium | 프롬프트에 명시적 금지 규칙 추가 + `renderInsight`가 항상 고정 disclaimer 캡션을 코드로 append(LLM 출력만 신뢰하지 않음) |
| `ANTHROPIC_API_KEY` 미해결로 인사이트 섹션이 프로덕션에서 계속 비활성 | High | Low | 기존 graceful degradation("인사이트를 생성하지 못했습니다")이 이미 처리 중, 이번 작업과 무관한 기존 이슈 |
| 파일 분리(`dashboardSections.js`) 과정에서 카드 렌더링 순서/필드 매핑 실수 | Low | Medium | Task 17의 전체 조립 스모크 테스트로 렌더링 결과를 문자열 매칭으로 검증 |
| Naver 스크래핑 선택자 미검증 상태 지속 (기존 이슈) | Low | Low | 이번 작업 범위 밖 — 기존 로그상 정상 동작 중으로 추정됨, 별도 확인 불필요 |

## Notes
- 이 계획은 순수 데이터·문구 개선과 파일 리팩터링 위주이며, 신규 외부 의존성이나 인프라 변경은 없다 (기존 GitHub Actions 워크플로우, GitHub Pages 배포, 3-job 파이프라인 구조는 그대로 유지).
- "관심 기업" 리스트(AAPL/MSFT/NVDA/AMZN/GOOGL)는 초기 MVP로 하드코딩하며, 추후 사용자가 직접 종목을 선택하는 기능은 별도 요청 시 후속 계획으로 분리한다.
- 매수/매도 추천 금지 가드레일은 (1) 프롬프트 지침, (2) 코드에서 고정 disclaimer 문구를 항상 append, (3) 화면 상/하단 배너, 이렇게 3중으로 배치해 LLM 출력만으로는 통제할 수 없는 리스크를 코드 레벨에서 보강한다.
