# Plan: Daily Market Telegram Report

## Summary
매일 오전 9시(KST) GitHub Actions cron으로 실행되어, 미국/국내 증시 데이터(Alpha Vantage·FMP API), 외국인/기관 매매 동향(Playwright 스크래핑: 네이버 증권·인베스팅닷컴), Claude API 인사이트를 수집·조합하여 텔레그램으로 마크다운 리포트를 발송하는 Node.js 배치 시스템. 완전 신규(greenfield) 프로젝트.

## User Story
As a 개인 투자자,
I want 매일 아침 미국/국내 증시 현황과 외국인 동향, AI 인사이트를 텔레그램으로 자동 수신,
So that 출근 전에 장중 대응 전략을 빠르게 세울 수 있다.

## Problem → Solution
[현재: 매일 아침 여러 사이트를 수동으로 확인해야 함] → [해결: 09:00 KST에 자동 수집·분석된 요약 리포트가 텔레그램으로 도착]

## Metadata
- **Complexity**: Large (외부 통합 다수, 신규 서브시스템)
- **Source PRD**: N/A (자유 서술 요청)
- **PRD Phase**: N/A
- **Estimated Files**: ~28개

---

## UX Design

### Before
```
┌─────────────────────────────┐
│ 사용자가 매일 아침 직접      │
│ 네이버증권/인베스팅닷컴/     │
│ 각종 앱을 열어 확인          │
└─────────────────────────────┘
```

### After
```
┌─────────────────────────────┐
│ 09:00 KST 텔레그램 푸시      │
│ ┌─ 🇺🇸 미국 증시 요약        │
│ ├─ 🇰🇷 국내 증시 요약        │
│ ├─ 💱 외국인/기관 동향       │
│ └─ 🤖 Claude 인사이트        │
└─────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| 정보 수집 | 수동, 여러 앱/사이트 | 자동, 텔레그램 1건 | GitHub Actions cron |
| 실패 시 | N/A | 부분 성공 메시지 (일부 섹션 "데이터 없음") | graceful degradation |

---

## Mandatory Reading (외부 자료 — 신규 프로젝트라 내부 코드베이스 없음)

| Priority | Source | Why |
|---|---|---|
| P0 | Alpha Vantage 공식 문서 (alphavantage.co/documentation) | 무료 티어 **25 req/day, 5 req/min** — 호출 최소화 설계 필수 |
| P0 | FMP 공식 문서 (site.financialmodelingprep.com/developer/docs) | 무료 티어 250 req/day, EOD 데이터만 (실시간은 유료) |
| P1 | Playwright docs — GitHub Actions 캐싱 | `~/.cache/ms-playwright` 캐시, `install --with-deps chromium`만 설치 (Firefox/WebKit 불필요) |
| P1 | @anthropic-ai/sdk npm/GitHub | `messages.create({ model, max_tokens, system, messages })` |
| P2 | node-telegram-bot-api / Telegram Bot API `sendMessage` | polling 불필요, 단발성 발송이므로 axios 직접 호출 권장 (봇 프로세스 상주 불필요) |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Alpha Vantage 무료 티어 한도 | alphavantage.co/support | 일 25회 / 분당 5회 — GLOBAL_QUOTE, TREASURY_YIELD 등 소수 핵심 지표만 호출, 캐싱 필수 |
| FMP 무료 티어 | site.financialmodelingprep.com/developer/docs/pricing | 일 250회, EOD 전용. quote/indexes/news/marketPerformance 사용 가능 |
| Playwright CI 설치 | microsoft/playwright GitHub issues, dev.to 캐싱 가이드 | `actions/cache`로 `~/.cache/ms-playwright` 캐싱 + 캐시 미스 시에만 `install --with-deps` |
| Anthropic Node SDK | github.com/anthropics/anthropic-sdk-typescript | ESM/CJS 모두 지원, Node 20 LTS+. 모델은 `claude-sonnet-5` 사용 (요청사항) |

---

## Architecture (신규 설계 — 모듈 규약)

### 디렉토리 구조
```
market-dashboard/
├── .github/
│   └── workflows/
│       └── daily-report.yml        # cron 00:00 UTC = 09:00 KST
├── src/
│   ├── config/
│   │   ├── env.js                  # 환경변수 로드 + 검증 (fail-fast)
│   │   └── constants.js            # 티커 목록, 타임아웃, 캐시 TTL 등 상수
│   ├── collectors/                 # API 기반 수집기 (Alpha Vantage, FMP)
│   │   ├── alphaVantageClient.js   # 저수준 axios 래퍼 (rate-limit 큐 포함)
│   │   ├── fmpClient.js            # 저수준 axios 래퍼
│   │   ├── usMarketCollector.js    # 미국 지수/종목 요약 (S&P500, Nasdaq, Dow)
│   │   └── treasuryCollector.js    # 국채금리 (Alpha Vantage TREASURY_YIELD)
│   ├── scrapers/                   # Playwright 기반 스크래퍼
│   │   ├── browserFactory.js       # Playwright 브라우저 인스턴스 생성/종료 공통화
│   │   ├── naverMarketScraper.js   # 국내 코스피/코스닥 지수
│   │   └── foreignFlowScraper.js   # 외국인/기관 순매매 동향 (네이버 증권)
│   ├── analysis/
│   │   ├── claudeInsightGenerator.js # 수집 데이터 → Claude API 인사이트 생성
│   │   └── promptBuilder.js        # 프롬프트 템플릿 조립 (순수 함수)
│   ├── notifiers/
│   │   └── telegramNotifier.js     # 텔레그램 sendMessage (Markdown, 청크 분할)
│   ├── formatters/
│   │   └── reportFormatter.js      # 수집 결과 → 텔레그램 메시지 문자열 조합
│   ├── pipeline/
│   │   └── runDailyReport.js       # 전체 오케스트레이션 (Promise.allSettled 병렬 수집)
│   └── utils/
│       ├── logger.js               # 구조화 로깅 (레벨별)
│       ├── retry.js                # 지수 백오프 재시도 유틸
│       └── rateLimiter.js          # 분당 호출 제한 큐 (Alpha Vantage 5/min 대응)
├── scripts/
│   └── runLocal.js                 # `npm run report:local` 진입점 (.env 로드)
├── test/
│   ├── unit/
│   │   ├── collectors/*.test.js
│   │   ├── scrapers/*.test.js
│   │   ├── analysis/*.test.js
│   │   ├── formatters/*.test.js
│   │   └── utils/*.test.js
│   └── fixtures/                   # API 응답 mock JSON
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### 모듈 책임 (인터페이스 설계)

| 모듈 | 책임 | 주요 export |
|---|---|---|
| `config/env.js` | 환경변수 로드 + 필수값 검증(fail-fast, 시작 시 즉시 에러) | `loadConfig(): Config` |
| `collectors/alphaVantageClient.js` | HTTP 호출 + 분당 5회 rate limit 큐잉 + 재시도 | `fetchAlphaVantage(params): Promise<object>` |
| `collectors/fmpClient.js` | HTTP 호출 + 재시도 | `fetchFmp(path, params): Promise<object>` |
| `collectors/usMarketCollector.js` | 미국 지수 요약 데이터 조합 | `collectUsMarket(): Promise<UsMarketResult>` |
| `collectors/treasuryCollector.js` | 국채금리 조회 | `collectTreasuryYield(): Promise<TreasuryResult>` |
| `scrapers/browserFactory.js` | Playwright 브라우저/컨텍스트 생명주기 관리 (try/finally close 보장) | `withBrowserPage(fn): Promise<T>` |
| `scrapers/naverMarketScraper.js` | 코스피/코스닥 현재가 스크래핑 | `scrapeKrMarket(page): Promise<KrMarketResult>` |
| `scrapers/foreignFlowScraper.js` | 외국인/기관 순매매 스크래핑 | `scrapeForeignFlow(page): Promise<ForeignFlowResult>` |
| `analysis/promptBuilder.js` | 순수 함수, 수집 데이터 → 프롬프트 문자열 | `buildInsightPrompt(data): string` |
| `analysis/claudeInsightGenerator.js` | Claude API 호출 | `generateInsight(data): Promise<string>` |
| `formatters/reportFormatter.js` | 순수 함수, 결과 → 텔레그램 마크다운 문자열 | `formatReport(sections): string` |
| `notifiers/telegramNotifier.js` | 텔레그램 발송 (4096자 청크 분할) | `sendTelegramMessage(text): Promise<void>` |
| `pipeline/runDailyReport.js` | 전체 오케스트레이션, 부분 실패 허용 | `runDailyReport(): Promise<void>` |
| `utils/rateLimiter.js` | 호출 큐잉 (토큰버킷 간이 구현) | `createRateLimiter(maxPerWindow, windowMs)` |
| `utils/retry.js` | 지수 백오프 | `withRetry(fn, opts): Promise<T>` |
| `utils/logger.js` | 로깅 | `logger.info/warn/error(msg, meta)` |

### 각 수집 결과 공통 Shape (불변 객체, 매 호출 새 객체 반환)
```js
// SUCCESS
{ status: 'ok', source: 'alpha-vantage', data: { ... }, fetchedAt: '<ISO>' }
// FAILURE (throw 하지 않고 반환 — graceful degradation)
{ status: 'error', source: 'naver-scraper', error: '<message>', fetchedAt: '<ISO>' }
```

---

## Patterns to Mirror (신규 프로젝트 컨벤션 — 이후 모든 코드가 따라야 함)

### NAMING_CONVENTION
- 파일: camelCase (`usMarketCollector.js`)
- 함수: camelCase 동사형 (`collectUsMarket`, `scrapeKrMarket`, `formatReport`)
- 상수: UPPER_SNAKE_CASE (`MAX_TELEGRAM_MESSAGE_LENGTH`)
- 모듈은 CommonJS(`require`/`module.exports`) 사용 — GitHub Actions 기본 Node 런타임과 마찰 없이 동작하도록 `"type": "commonjs"` 유지 (package.json에 명시하지 않으면 기본값이 CJS)

### ERROR_HANDLING (모든 collector/scraper 공통)
```js
// SOURCE: 신규 설계 — collectors/usMarketCollector.js에서 사용할 패턴
async function collectUsMarket() {
  try {
    const data = await fetchAlphaVantage({ function: 'GLOBAL_QUOTE', symbol: 'SPY' });
    return { status: 'ok', source: 'alpha-vantage-us', data, fetchedAt: new Date().toISOString() };
  } catch (err) {
    logger.error('US market collection failed', { error: err.message });
    return { status: 'error', source: 'alpha-vantage-us', error: err.message, fetchedAt: new Date().toISOString() };
  }
}
```
- 개별 collector/scraper는 **절대 throw하지 않고** 위 shape을 반환한다 (파이프라인 레벨에서 `Promise.allSettled` 이중 방어 불필요하게 단순화).
- `pipeline/runDailyReport.js`에서만 예외적으로 top-level try/catch로 텔레그램 발송 자체의 실패를 잡아 로그를 남긴다.

### RATE_LIMITING (Alpha Vantage 5 req/min, 25 req/day 대응)
```js
// SOURCE: 신규 설계 — utils/rateLimiter.js
function createRateLimiter(maxPerWindow, windowMs) {
  let timestamps = [];
  return async function acquire() {
    const now = Date.now();
    timestamps = timestamps.filter((t) => now - t < windowMs);
    if (timestamps.length >= maxPerWindow) {
      const waitMs = windowMs - (now - timestamps[0]);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    timestamps = [...timestamps, Date.now()];
  };
}
```
- `alphaVantageClient.js`는 이 limiter를 모듈 스코프에서 1개 생성해 모든 호출 전에 `await acquire()` 실행.
- **GOTCHA**: 하루 실행에서 Alpha Vantage 호출은 반드시 4회 이하로 설계 (지수 요약 1~2회 + 국채금리 1회 등). 종목별 개별 quote 호출 남발 금지 — 대신 FMP의 `marketPerformance`/`indexes`(하루 250회 여유)로 대체 가능한 항목은 FMP를 우선 사용.

### RETRY_PATTERN
```js
// SOURCE: 신규 설계 — utils/retry.js
async function withRetry(fn, { retries = 2, baseDelayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}
```

### SCRAPER_PATTERN (Playwright 리소스 누수 방지)
```js
// SOURCE: 신규 설계 — scrapers/browserFactory.js
async function withBrowserPage(fn) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    return await fn(page);
  } finally {
    await browser.close();
  }
}
```
- **GOTCHA**: `finally`에서 반드시 `browser.close()` — GitHub Actions 러너에서 좀비 프로세스로 인한 잡 hang 방지.
- 스크래핑 대상 사이트(네이버 증권, 인베스팅닷컴)는 구조 변경 위험이 있으므로 셀렉터를 상수로 분리하고, 셀렉터 실패 시 `{ status: 'error' }`로 degrade.

### TELEGRAM_CHUNKING (4096자 제한 대응)
```js
// SOURCE: 신규 설계 — notifiers/telegramNotifier.js
const MAX_TELEGRAM_MESSAGE_LENGTH = 4000; // 여유 마진
function splitMessage(text) {
  if (text.length <= MAX_TELEGRAM_MESSAGE_LENGTH) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH));
    remaining = remaining.slice(MAX_TELEGRAM_MESSAGE_LENGTH);
  }
  return chunks;
}
```

### TEST_STRUCTURE (Node 내장 test runner 사용 — 외부 의존성 최소화)
```js
// SOURCE: 신규 설계 — test/unit/formatters/reportFormatter.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { formatReport } = require('../../../src/formatters/reportFormatter');

test('returns "데이터 없음" section when a source failed', () => {
  const sections = { us: { status: 'error', source: 'x', error: 'timeout' } };
  const result = formatReport(sections);
  assert.match(result, /데이터를 가져오지 못했습니다/);
});
```
- `node:test` + `node:assert/strict` 사용 (Node 20 LTS 내장, 추가 의존성 불필요) → package.json에 `"test": "node --test test/unit/**/*.test.js"`.
- 외부 API/Playwright는 전부 mock (axios는 함수 주입 또는 `node:test`의 `mock.method` 사용, Playwright는 `page` 객체를 mock으로 주입).

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `package.json` | CREATE | 의존성/스크립트 정의 |
| `.env.example` | CREATE | 필수 환경변수 문서화 (값 없이) |
| `.gitignore` | CREATE | `.env`, `node_modules`, playwright 리포트 제외 |
| `.github/workflows/daily-report.yml` | CREATE | cron 스케줄러, secrets 주입, Playwright 캐싱 |
| `src/config/env.js` | CREATE | 환경변수 로드/검증 |
| `src/config/constants.js` | CREATE | 티커, 셀렉터, 타임아웃 상수 |
| `src/utils/logger.js` | CREATE | 구조화 로깅 |
| `src/utils/retry.js` | CREATE | 재시도 유틸 |
| `src/utils/rateLimiter.js` | CREATE | 호출 제한 큐 |
| `src/collectors/alphaVantageClient.js` | CREATE | AV 저수준 클라이언트 |
| `src/collectors/fmpClient.js` | CREATE | FMP 저수준 클라이언트 |
| `src/collectors/usMarketCollector.js` | CREATE | 미국 증시 수집 |
| `src/collectors/treasuryCollector.js` | CREATE | 국채금리 수집 |
| `src/scrapers/browserFactory.js` | CREATE | Playwright 생명주기 관리 |
| `src/scrapers/naverMarketScraper.js` | CREATE | 국내 지수 스크래핑 |
| `src/scrapers/foreignFlowScraper.js` | CREATE | 외국인/기관 동향 스크래핑 |
| `src/analysis/promptBuilder.js` | CREATE | 프롬프트 조립 |
| `src/analysis/claudeInsightGenerator.js` | CREATE | Claude 인사이트 생성 |
| `src/formatters/reportFormatter.js` | CREATE | 텔레그램 메시지 포맷 |
| `src/notifiers/telegramNotifier.js` | CREATE | 텔레그램 발송 |
| `src/pipeline/runDailyReport.js` | CREATE | 오케스트레이션 |
| `scripts/runLocal.js` | CREATE | 로컬 실행 진입점 |
| `test/unit/**/*.test.js` | CREATE | 단위 테스트 (모듈당 1개 이상) |
| `test/fixtures/*.json` | CREATE | mock 응답 데이터 |
| `README.md` | CREATE | 설치/실행/배포 안내 |

## NOT Building
- 텔레그램 봇의 인터랙티브 명령어(예: `/status`, 버튼) — 단방향 알림 발송만 구현
- 데이터베이스/영속 저장소 — 매 실행이 stateless, 과거 이력 저장 없음
- 다중 사용자/다중 채팅방 발송 — 단일 `TELEGRAM_CHAT_ID`만 지원
- 실시간(intraday) 스트리밍 — 1일 1회 배치만 지원
- Alpha Vantage/FMP 유료 티어 기능(실시간 데이터, bulk quotes 등)
- 프론트엔드 대시보드 UI — 순수 백엔드 배치 + 텔레그램 알림

---

## Step-by-Step Tasks

### Task 1: 프로젝트 초기화
- **ACTION**: `package.json`, `.gitignore`, `.env.example` 생성
- **IMPLEMENT**: `npm init` 동등 package.json 작성 (`type: commonjs`, scripts: `report:local`, `test`, `lint` 자리 확보). 의존성: `axios`, `playwright`, `@anthropic-ai/sdk`, `dotenv`. devDependencies는 없음(내장 test runner 사용).
- **MIRROR**: N/A (최초 파일)
- **IMPORTS**: N/A
- **GOTCHA**: `.env`는 반드시 `.gitignore`에 포함, 실제 토큰 값은 커밋 금지
- **VALIDATE**: `npm install` 성공, `cat .gitignore`에 `.env` 존재 확인

### Task 2: 환경설정 모듈
- **ACTION**: `src/config/env.js`, `src/config/constants.js` 작성
- **IMPLEMENT**: `loadConfig()`는 5개 필수 env var 미존재 시 즉시 throw (fail-fast). constants.js에는 미국 지수 티커(`SPY`,`QQQ`,`DIA`), 네이버 증권 URL, CSS 셀렉터, 타임아웃(ms), Alpha Vantage rate limit 설정(5/min, 25/day) 정의.
- **MIRROR**: ERROR_HANDLING 패턴 (throw는 설정 로드 시점에만 허용 — 이는 시스템 시작 전 fail-fast이므로 예외)
- **IMPORTS**: `dotenv`
- **GOTCHA**: GitHub Actions에서는 `.env` 파일이 없고 `process.env`에 secrets가 직접 주입되므로, `dotenv.config()` 호출은 로컬 실행(`scripts/runLocal.js`)에서만 수행하고 `env.js` 자체는 dotenv에 의존하지 않는다.
- **VALIDATE**: 필수 변수 하나 빼고 실행 시 명확한 에러 메시지로 종료되는지 단위 테스트

### Task 3: 공통 유틸 (logger, retry, rateLimiter)
- **ACTION**: `src/utils/logger.js`, `retry.js`, `rateLimiter.js` 작성
- **IMPLEMENT**: logger는 `{level, timestamp, message, meta}` JSON 라인 출력(GitHub Actions 로그 파싱 용이). retry/rateLimiter는 위 "Patterns to Mirror" 코드 그대로.
- **MIRROR**: RETRY_PATTERN, RATE_LIMITING
- **IMPORTS**: 없음 (순수 Node)
- **GOTCHA**: rateLimiter는 모듈 스코프 싱글턴으로 export해야 모든 alphaVantageClient 호출이 동일 큐를 공유
- **VALIDATE**: `retry.test.js`에서 2회 실패 후 성공하는 mock 함수로 최종 성공 검증, `rateLimiter.test.js`에서 6번째 호출이 지연되는지 timer mock으로 검증

### Task 4: Alpha Vantage / FMP 클라이언트
- **ACTION**: `src/collectors/alphaVantageClient.js`, `fmpClient.js` 작성
- **IMPLEMENT**: axios 인스턴스 + `withRetry` + (AV만) `rateLimiter.acquire()` 선행. 함수 시그니처: `fetchAlphaVantage(params)`, `fetchFmp(path, params)`.
- **MIRROR**: RETRY_PATTERN
- **IMPORTS**: `axios`, `../utils/retry`, `../utils/rateLimiter`, `../config/env`
- **GOTCHA**: Alpha Vantage는 오류도 HTTP 200 + `{"Note": "..."}` 형태로 반환하는 경우가 있음 — response body에 `Note`/`Error Message` 키가 있으면 명시적으로 에러 throw 처리 필요
- **VALIDATE**: axios mock으로 성공/실패/rate-limit-note 3가지 케이스 단위 테스트

### Task 5: 수집기 (collectors) 구현
- **ACTION**: `usMarketCollector.js`, `treasuryCollector.js` 작성
- **IMPLEMENT**: ERROR_HANDLING 패턴 그대로 적용, 결과 shape 통일
- **MIRROR**: ERROR_HANDLING
- **IMPORTS**: 각 클라이언트, `../utils/logger`
- **GOTCHA**: 미국 지수는 FMP `quote`(무료 티어 가능, EOD)로 SPY/QQQ/DIA 조회, Alpha Vantage는 국채금리(TREASURY_YIELD)처럼 FMP에 없는 항목에만 사용해 호출 총량 최소화
- **VALIDATE**: mock 클라이언트로 성공/실패 각각 shape 검증

### Task 6: Playwright 스크래퍼 구현
- **ACTION**: `browserFactory.js`, `naverMarketScraper.js`, `foreignFlowScraper.js` 작성
- **IMPLEMENT**: SCRAPER_PATTERN 그대로, 셀렉터는 constants.js에서 import
- **MIRROR**: SCRAPER_PATTERN, ERROR_HANDLING
- **IMPORTS**: `playwright`, `../config/constants`, `../utils/logger`
- **GOTCHA**: 네이버 증권/인베스팅닷컴은 로봇 차단 가능 — `page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })` + User-Agent 설정, 실패 시 재시도 없이 바로 degrade(스크래핑은 retry 남용 시 차단 위험 증가하므로 최대 1회 재시도로 제한)
- **VALIDATE**: mock `page` 객체(`$eval`이 고정값 반환)로 파싱 로직만 단위 테스트, 실제 브라우저 호출은 테스트에서 제외

### Task 7: Claude 인사이트 생성
- **ACTION**: `promptBuilder.js`, `claudeInsightGenerator.js` 작성
- **IMPLEMENT**: `buildInsightPrompt(data)`는 순수 함수(수집된 성공 섹션만 조합해 문자열 생성). `generateInsight`는 `@anthropic-ai/sdk`로 `model: 'claude-sonnet-5'`, `max_tokens: 800` 호출.
- **MIRROR**: ERROR_HANDLING
- **IMPORTS**: `@anthropic-ai/sdk`, `./promptBuilder`
- **GOTCHA**: 모든 수집 섹션이 실패한 경우 Claude 호출 자체를 스킵하고 "데이터 부족으로 인사이트 생략" 반환 (불필요한 API 비용 방지)
- **VALIDATE**: promptBuilder는 입력→출력 스냅샷 테스트, claudeInsightGenerator는 SDK mock으로 호출 파라미터 검증

### Task 8: 리포트 포맷터 + 텔레그램 발송
- **ACTION**: `reportFormatter.js`, `telegramNotifier.js` 작성
- **IMPLEMENT**: TELEGRAM_CHUNKING 패턴, 섹션별 헤더(🇺🇸 미국 증시 / 🇰🇷 국내 증시 / 💱 외국인·기관 동향 / 🤖 Claude 인사이트), 실패 섹션은 "⚠️ 데이터를 가져오지 못했습니다" 표기
- **MIRROR**: TELEGRAM_CHUNKING
- **IMPORTS**: `axios` (Telegram Bot API `sendMessage` 직접 호출, `parse_mode: 'Markdown'`)
- **GOTCHA**: 텔레그램 Markdown은 특수문자(`_`, `*`, `` ` ``, `[`) escape 필요 — 종목명에 특수문자 포함 시 깨짐 방지를 위해 간단한 escape 함수 적용
- **VALIDATE**: formatter는 순수 함수 스냅샷 테스트, notifier는 axios mock으로 청크 분할 개수/순서 검증

### Task 9: 파이프라인 오케스트레이션
- **ACTION**: `src/pipeline/runDailyReport.js` 작성
- **IMPLEMENT**: `Promise.allSettled`로 usMarket, treasury, krMarket(Playwright는 단일 브라우저 인스턴스 재사용해 국내지수+외국인동향 순차 스크래핑), 각 결과 취합 → Claude 인사이트 → formatter → notifier. 최상위 try/catch로 텔레그램 발송 실패까지 로깅.
- **MIRROR**: ERROR_HANDLING
- **IMPORTS**: 위 전체 모듈
- **GOTCHA**: Playwright 브라우저는 스크래퍼 2개마다 새로 띄우지 말고 `withBrowserPage` 1회 호출 내에서 페이지만 재사용/재생성 (리소스 절약)
- **VALIDATE**: 통합 단위 테스트로 일부 collector가 error를 반환해도 파이프라인이 끝까지 완주하고 notifier가 호출되는지 검증

### Task 10: 로컬 실행 스크립트 + GitHub Actions
- **ACTION**: `scripts/runLocal.js`, `.github/workflows/daily-report.yml` 작성
- **IMPLEMENT**: runLocal.js는 `dotenv.config()` 후 `runDailyReport()` 호출. workflow는 `on.schedule.cron: '0 0 * * *'`(00:00 UTC = 09:00 KST, 서머타임 없음 확인됨), `actions/checkout`, `actions/setup-node@v4`, `npm ci`, Playwright 캐시(`actions/cache` key: `playwright-${{ hashFiles('package-lock.json') }}`), 캐시 미스 시 `npx playwright install --with-deps chromium`, `env:` 블록에 5개 secrets 매핑, `workflow_dispatch` 수동 트리거도 추가(디버그용).
- **MIRROR**: N/A
- **IMPORTS**: N/A
- **GOTCHA**: GitHub Actions cron은 UTC 고정이며 최대 대기시간이 발생할 수 있음(트래픽 몰림 시 지연) — README에 "정확히 09:00이 아닐 수 있음" 명시
- **VALIDATE**: `act` 또는 로컬에서 `node scripts/runLocal.js` 실행해 실제 텔레그램 메시지 수신 확인 (사용자가 직접 실행)

### Task 11: README 작성
- **ACTION**: `README.md` 작성
- **IMPLEMENT**: 설치법, `.env` 설정법, 로컬 실행법, GitHub Secrets 등록 방법, 아키텍처 다이어그램(텍스트), 트러블슈팅(Alpha Vantage 한도 초과 시 대응)
- **VALIDATE**: 사용자가 문서만 보고 처음부터 셋업 가능한지 체크

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| rateLimiter | 6회 연속 acquire (limit=5/window) | 6번째 호출이 지연 | Y |
| retry | 2회 실패 후 성공하는 fn | 3번째 시도에서 resolve | Y |
| alphaVantageClient | body에 `Note` 포함 응답 | 명시적 에러 throw | Y (rate limit 응답) |
| usMarketCollector | fmpClient mock 실패 | `{status:'error', ...}` 반환, throw 없음 | Y |
| naverMarketScraper | mock page (`$eval` 고정값) | 파싱된 숫자/텍스트 반환 | N |
| promptBuilder | 일부 섹션 error | error 섹션 제외하고 프롬프트 조립 | Y |
| reportFormatter | 전체 섹션 error | "데이터를 가져오지 못했습니다" 문구 포함 | Y (전체 실패) |
| telegramNotifier | 5000자 텍스트 | 2개 청크로 분할 발송 | Y (경계값) |
| runDailyReport | 일부 collector error, notifier mock | notifier가 정확히 1회(or 청크 수만큼) 호출됨 | Y |

### Edge Cases Checklist
- [x] 모든 소스 실패 (네트워크 완전 차단) → "데이터 수집 실패" 메시지만 발송
- [x] Alpha Vantage rate limit 초과 응답
- [x] 텔레그램 메시지 4096자 초과
- [x] Playwright 셀렉터 변경으로 인한 파싱 실패
- [x] Claude API 실패 시 인사이트 섹션만 생략
- [ ] 동시 실행(cron 중복 트리거) — GitHub Actions 특성상 스케줄 중복 실행 가능성 낮음, 별도 락 불필요 (NOT Building에 명시)

---

## Validation Commands

### Static Analysis
```bash
node --check src/**/*.js
```
EXPECT: 문법 오류 없음 (프로젝트에 별도 린터/타입체커 미도입 — JS 순수 프로젝트, `node --check`로 대체)

### Unit Tests
```bash
npm test
```
EXPECT: 전체 단위 테스트 통과 (collectors/scrapers/analysis/formatters/utils)

### Manual Validation
```bash
cp .env.example .env   # 실제 키 값 채워넣기 (커밋 금지)
npm run report:local
```
EXPECT: 콘솔에 각 단계 로그 출력 + 실제 텔레그램 채팅방에 메시지 수신

### GitHub Actions Validation
- [ ] 레포에 5개 Secrets 등록 (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ANTHROPIC_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `FMP_API_KEY`)
- [ ] `workflow_dispatch`로 수동 실행해 성공 확인
- [ ] 익일 09:00 KST 자동 실행 확인

---

## Acceptance Criteria
- [ ] 모든 태스크 완료
- [ ] `npm test` 전체 통과
- [ ] `node --check`로 문법 오류 없음
- [ ] 로컬 실행 시 실제 텔레그램 메시지 수신 확인 (사용자 수동 검증)
- [ ] 일부 데이터 소스 실패 시에도 리포트가 발송됨 (graceful degradation)
- [ ] `.env` 값이 git 이력에 전혀 포함되지 않음

## Completion Checklist
- [ ] 코드가 위 컨벤션(Patterns to Mirror)을 따름
- [ ] 에러 처리가 ERROR_HANDLING 패턴과 일치
- [ ] 로깅이 logger.js 통해 일관되게 이루어짐
- [ ] 테스트가 TEST_STRUCTURE 패턴을 따름
- [ ] 하드코딩된 값 없음 (constants.js/env.js로 분리)
- [ ] README 최신화
- [ ] 불필요한 범위 확장 없음 (NOT Building 항목 미포함 확인)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Alpha Vantage 일일 25회 한도 초과 | Medium | High (리포트 실패) | 하루 호출 4회 이내로 설계, 가능한 항목은 FMP로 대체, 실패 시 graceful degradation |
| 네이버 증권/인베스팅닷컴 DOM 구조 변경 | Medium | Medium (스크래핑 실패) | 셀렉터 상수 분리, 실패 시 해당 섹션만 생략 후 계속 진행 |
| GitHub Actions 러너에서 스크래핑 대상 사이트가 봇 차단 | Low-Medium | Medium | User-Agent 설정, 최소 재시도, 실패 허용 설계 |
| 텔레그램 봇 토큰이 채팅에 노출됨(이번 대화) | 확정 발생 | Medium (토큰 유출) | `.env`에만 저장·`.gitignore` 처리. 사용자에게 토큰 재발급(BotFather `/revoke`) 권장 |
| Claude API 비용 누적 | Low | Low | 1일 1회 호출로 제한, max_tokens 800으로 캡 |

## Notes
- 신규(greenfield) 프로젝트이므로 Phase 2(코드베이스 탐색)는 "미러링할 기존 패턴 없음"으로 처리하고, 대신 위 "Patterns to Mirror" 섹션에 **이 프로젝트 자체의 신규 컨벤션**을 정의해 이후 모든 구현이 일관되도록 함.
- MCP 도구(Alpha Vantage MCP, FMP MCP)는 로컬 설계/디버깅 참고용으로만 언급되었고, 실제 GitHub Actions 실행 환경에서는 각 서비스의 REST API를 axios로 직접 호출한다.
- 사용자가 채팅에 텔레그램 봇 토큰을 평문으로 제공했음 — 이 토큰은 코드/커밋에 절대 포함하지 않고 `.env`(로컬)와 GitHub Secrets(CI)로만 사용. 노출 이력이 있으므로 BotFather에서 토큰 재발급을 권장.
