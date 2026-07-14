# Implementation Report: Daily Market Telegram Report

## Summary
매일 09:00 KST(GitHub Actions cron 00:00 UTC)에 미국 증시(FMP), 국채금리(Alpha Vantage), 국내 지수·외국인/기관 동향(Playwright→네이버 증권), Claude 인사이트를 수집·조합해 텔레그램으로 발송하는 Node.js 배치 시스템을 구현했다. 19개 소스 파일 + 13개 테스트 파일 + GitHub Actions workflow로 구성.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Large | Large (일치) |
| Confidence | 8/10 | 구현 중 버그 1건 발견·수정, 대체로 계획대로 진행 |
| Files Changed | ~28개 | 32개 (js/yml 기준, README/package.json/.env* 등 별도) |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | 프로젝트 초기화 | ✅ Complete | package.json, .gitignore, .env(.example) |
| 2 | 환경설정 모듈 | ✅ Complete | env.js, constants.js |
| 3 | 공통 유틸 | ✅ Complete | logger, retry, rateLimiter + 테스트 |
| 4 | AV/FMP 클라이언트 | ✅ Complete | + 테스트 |
| 5 | 수집기 | ✅ Complete | usMarketCollector, treasuryCollector + 테스트 |
| 6 | Playwright 스크래퍼 | ✅ Complete | 버그 수정 발생 (아래 참조) |
| 7 | Claude 인사이트 | ✅ Complete | + 테스트 |
| 8 | 포맷터/텔레그램 발송 | ✅ Complete | + 테스트 |
| 9 | 파이프라인 오케스트레이션 | ✅ Complete | DI 방식으로 테스트 가능하게 구현 |
| 10 | 로컬 스크립트 + GitHub Actions | ✅ Complete | Playwright 캐싱 포함 |
| 11 | README + 전체 검증 | ✅ Complete | npm test, npm run lint 통과 |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | ✅ Pass | `node --check` 전체 통과 (프로젝트에 타입체커/린터 미도입, 계획대로 대체) |
| Unit Tests | ✅ Pass | 35 tests, 0 fail (`node --test`) |
| Build | N/A | 순수 Node.js 스크립트, 별도 빌드 단계 없음 |
| Integration | N/A | 실제 API/텔레그램 발송은 사용자가 `.env` 채운 뒤 `npm run report:local`로 수동 검증 필요 |
| Edge Cases | ✅ Pass | 전체 실패, rate limit 응답, 4096자 초과, 셀렉터 파싱 실패, Claude 스킵 케이스 모두 테스트됨 |

## Files Changed

| File | Action | Lines(대략) |
|---|---|---|
| `package.json` | CREATED | 24 |
| `.gitignore` | CREATED | 6 |
| `.env.example` / `.env` | CREATED | 16 |
| `.github/workflows/daily-report.yml` | CREATED | 45 |
| `src/config/env.js` | CREATED | 22 |
| `src/config/constants.js` | CREATED | 38 |
| `src/utils/logger.js` | CREATED | 22 |
| `src/utils/retry.js` | CREATED | 27 |
| `src/utils/rateLimiter.js` | CREATED | 22 |
| `src/collectors/alphaVantageClient.js` | CREATED | 30 |
| `src/collectors/fmpClient.js` | CREATED | 15 |
| `src/collectors/usMarketCollector.js` | CREATED | 29 |
| `src/collectors/treasuryCollector.js` | CREATED | 27 |
| `src/scrapers/browserFactory.js` | CREATED | 15 |
| `src/scrapers/naverMarketScraper.js` | CREATED | 38 |
| `src/scrapers/foreignFlowScraper.js` | CREATED | 44 |
| `src/analysis/promptBuilder.js` | CREATED | 27 |
| `src/analysis/claudeInsightGenerator.js` | CREATED | 40 |
| `src/formatters/reportFormatter.js` | CREATED | 68 |
| `src/notifiers/telegramNotifier.js` | CREATED | 34 |
| `src/pipeline/runDailyReport.js` | CREATED | 51 |
| `scripts/runLocal.js` | CREATED | 9 |
| `test/unit/**/*.test.js` (13개 파일) | CREATED | ~450 |
| `README.md` | CREATED | 100 |

## Deviations from Plan
- **Git 브랜치 전략**: 계획서의 Phase 2(feature 브랜치 생성)는 이 레포가 커밋이 전혀 없는 최초 초기화 상태라 적용하지 않고 `main`에서 직접 작업함. (사유: 최초 부트스트랩 커밋에는 별도 feature 브랜치가 의미 없음)
- **`npm test` 스크립트**: 계획에는 `node --test test/unit`으로 명시했으나, 로컬 Node 22 환경에서 디렉터리 인자를 넘기면 `MODULE_NOT_FOUND`가 발생함(버전별 test runner 경로 처리 차이). 인자 없이 `node --test`로 변경해 프로젝트 루트 기준 자동 탐색하도록 수정.
- **`npm run lint` 스크립트**: 계획의 `node --check src/**/*.js` 형태는 쉘 glob이 재귀적으로 확장되지 않아 하위 디렉터리 파일을 놓침. `find src scripts -name '*.js' -exec node --check {} +`로 대체.
- **네이버 외국인/기관 동향 셀렉터**: 실제 라이브 사이트 DOM을 브라우저로 검증할 수 없어 ID 기반 고정 셀렉터 대신 테이블 행 텍스트에서 "외국인"/"기관" 키워드 + 숫자 존재 여부로 매칭하는 방식을 사용함. 실제 배포 전 라이브 사이트에서 한 번 검증 필요(README 트러블슈팅에 명시).

## Issues Encountered
- `parseInvestorFlow`에서 헤더 행("구분 개인 외국인 기관계")이 실제 데이터 행보다 먼저 키워드 매칭되어 `null`을 반환하는 버그를 단위 테스트로 발견. 키워드 매칭 조건에 "숫자 포함 여부"를 추가해 수정함 (`src/scrapers/foreignFlowScraper.js`).
- 로컬 npm 버전이 6.14.15로 Node 22와 버전 불일치가 있었으나 `npm install`/`npm test` 동작에는 영향 없음. CI는 `actions/setup-node@v4`로 Node 20 LTS 전용 npm을 사용하므로 무관.

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `test/unit/utils/retry.test.js` | 3 | 성공/재시도 후 성공/모든 재시도 소진 |
| `test/unit/utils/rateLimiter.test.js` | 2 | 한도 내 즉시 통과 / 한도 초과 시 지연 |
| `test/unit/collectors/alphaVantageClient.test.js` | 3 | 성공 / Note 에러 / Error Message 에러 |
| `test/unit/collectors/fmpClient.test.js` | 2 | 성공 / 네트워크 에러 전파 |
| `test/unit/collectors/usMarketCollector.test.js` | 3 | 성공 / 실패(graceful) / 일부 심볼 누락 |
| `test/unit/collectors/treasuryCollector.test.js` | 2 | 성공 / 실패(graceful) |
| `test/unit/scrapers/naverMarketScraper.test.js` | 2 | 성공 파싱 / 실패(graceful) |
| `test/unit/scrapers/foreignFlowScraper.test.js` | 4 | 파싱 성공 / 매칭 없음 / 스크래핑 성공 / 실패(graceful) |
| `test/unit/analysis/promptBuilder.test.js` | 3 | 사용 가능 데이터 판별 / 프롬프트 조립 |
| `test/unit/analysis/claudeInsightGenerator.test.js` | 3 | 전체 실패 시 스킵 / 성공 / API 실패(graceful) |
| `test/unit/formatters/reportFormatter.test.js` | 3 | 마크다운 이스케이프 / 성공 렌더링 / 전체 실패 경고 |
| `test/unit/notifiers/telegramNotifier.test.js` | 3 | 청크 분할 / 순서 보장 발송 |
| `test/unit/pipeline/runDailyReport.test.js` | 2 | 부분 실패에도 완주 / 텔레그램 실패 시 예외 전파 |

**합계**: 35 tests, 0 fail

## Next Steps
- [ ] 코드 리뷰 (`/code-review`) — 모듈화·중복 제거·성능 관점
- [ ] 네이버 증권 라이브 사이트에서 실제 셀렉터 검증
- [ ] `.env`에 실제 API 키(Anthropic, Alpha Vantage, FMP) 채운 뒤 `npm run report:local`로 수동 검증
- [ ] GitHub Secrets 등록 후 `workflow_dispatch`로 CI 수동 실행 검증
