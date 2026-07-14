# Code Review: Daily Market Telegram Report (Local Review)

**Reviewed**: 2026-07-14
**Scope**: 신규 프로젝트 전체 (커밋 이력 없음, 전 파일이 uncommitted)
**초점**: 모듈화, 중복 코드 제거, 성능 최적화 (사용자 요청)
**Decision**: APPROVE (발견된 이슈 전부 수정 완료)

## Summary
전반적으로 계층 구조(config → utils/collectors/scrapers → analysis/formatters/notifiers → pipeline)가 단방향이고 순환 의존성이 없다. 리뷰에서 3건의 실질적 이슈(마크다운 이스케이프 누락, 에러 핸들링 중복, Playwright 순차 처리)를 발견해 모두 수정했다.

## Findings

### CRITICAL
None

### HIGH
- **[수정 완료]** `src/formatters/reportFormatter.js`: 네이버 스크래핑 결과(코스피/코스닥 값, 외국인·기관 순매수)가 텔레그램 마크다운으로 이스케이프 없이 삽입됨. 스크래핑 대상 DOM이 예상과 다른 텍스트를 반환하면 `_`/`*`/`` ` ``/`[` 등이 포함되어 Telegram `sendMessage` API가 마크다운 파싱 에러(400)로 리포트 전체 발송을 실패시킬 수 있었음. → `escapeMarkdown` 적용.

### MEDIUM
- **[수정 완료]** `src/collectors/usMarketCollector.js`, `treasuryCollector.js`, `src/scrapers/naverMarketScraper.js`, `foreignFlowScraper.js`: 4개 파일에서 `{status, source, data/error, fetchedAt}` try/catch 반환 패턴이 거의 동일하게 반복됨. → `src/utils/resultEnvelope.js`의 `withResultEnvelope(source, failureMessage, fn)`로 추출, `src/analysis/claudeInsightGenerator.js`의 API 호출 분기도 동일하게 적용. 5개 파일의 중복 로직이 1개 헬퍼 + 단위 테스트로 통합됨.
- **[수정 완료]** `src/pipeline/runDailyReport.js`: 국내 지수 스크래핑과 외국인/기관 동향 스크래핑이 같은 `page` 객체로 순차 `goto`되어, 이미 실행 중인 단일 브라우저 인스턴스 안에서도 불필요하게 직렬화됨. → `browserFactory.js`를 `withBrowser`/`createPage`로 분리해 브라우저 하나를 재사용하면서 페이지 2개를 병렬로 열고 `Promise.all`로 동시에 스크래핑하도록 변경. 브라우저 프로세스는 여전히 1개만 띄우므로 리소스 사용량 증가 없이 스크래핑 단계의 지연시간만 절반 수준으로 단축.

### LOW
- `src/config/constants.js`의 `NAVER_SELECTORS`(코스피/코스닥 ID 셀렉터, 외국인/기관 테이블 셀렉터)는 실제 라이브 사이트에서 검증되지 않았다. 스크래핑이라는 특성상 배포 전 1회 수동 확인이 필요함(README 트러블슈팅에 이미 명시됨).

## Validation Results

| Check | Result |
|---|---|
| 문법 검사 (`node --check`) | Pass |
| 단위 테스트 (`node --test`) | Pass — 37/37 (리팩터링 후 신규 `resultEnvelope.test.js` 2건 추가) |
| 빌드 | N/A (순수 Node 스크립트) |
| API/rate-limit 호출량 검토 | Alpha Vantage 1회/일, FMP 1회/일(배치 조회) — 무료 한도 대비 충분한 여유 확인 |
| 시크릿 노출 검토 | `.env`가 `git check-ignore`로 확인됨, git status에도 노출 안 됨 |

## Files Reviewed
전체 `src/`, `scripts/`, `test/`, `.github/workflows/`, `package.json` (Added, 커밋 이력 없음)

## Applied Fixes (검수 후 즉시 반영)
1. `src/formatters/reportFormatter.js` — 국내 증시/외국인 동향 섹션에 `escapeMarkdown` 적용
2. `src/utils/resultEnvelope.js` (신규) — 공통 결과 래핑 헬퍼 추출 + `test/unit/utils/resultEnvelope.test.js` (신규)
3. `src/collectors/usMarketCollector.js`, `treasuryCollector.js`, `src/scrapers/naverMarketScraper.js`, `foreignFlowScraper.js`, `src/analysis/claudeInsightGenerator.js` — `withResultEnvelope` 사용하도록 리팩터링
4. `src/scrapers/browserFactory.js` — `withBrowserPage` → `withBrowser` + `createPage`로 분리
5. `src/pipeline/runDailyReport.js` — 국내 지수/외국인 동향 스크래핑을 페이지 2개로 병렬화
