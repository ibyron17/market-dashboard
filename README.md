# market-dashboard

매일 **오전 9시(한국 시간)**에 미국/국내 증시 현황, 외국인·기관 매매 동향, Claude AI 인사이트를 자동으로 수집해서 텔레그램으로 보내주는 개인용 자동화 봇입니다.

```
📊 2026-07-14 데일리 마켓 리포트

🇺🇸 미국 증시
- S&P 500 (SPY): 512.34 (+0.8%)
- Nasdaq 100 (QQQ): 421.10 (+1.1%)
- Dow Jones (DIA): 389.22 (+0.3%)

🇰🇷 국내 증시
- 코스피: 2,650.12 (+10.50)
- 코스닥: 860.44 (-2.10)

💱 외국인·기관 동향
- 외국인 순매수: -1,234
- 기관 순매수: 5,678

🤖 Claude 인사이트
오늘 미국 증시는 기술주 중심으로 상승했고 ...
```

한 번 배포해두면 매일 위와 같은 메시지가 자동으로 텔레그램에 도착합니다. 사람이 매일 실행할 필요가 없습니다 (GitHub Actions가 대신 실행).

---

## 목차

1. [빠른 시작 (5분)](#빠른-시작-5분)
2. [API 키는 어디서 받나요?](#api-키는-어디서-받나요)
3. [로컬에서 테스트해보기](#로컬에서-테스트해보기)
4. [매일 자동 실행되게 배포하기 (GitHub Actions)](#매일-자동-실행되게-배포하기-github-actions)
5. [동작 원리 (아키텍처)](#동작-원리-아키텍처)
6. [자주 묻는 질문 / 문제 해결](#자주-묻는-질문--문제-해결)
7. [보안 주의사항](#보안-주의사항)
8. [프로젝트 구조](#프로젝트-구조)

---

## 빠른 시작 (5분)

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 파일 만들기
cp .env.example .env
```

`.env` 파일을 열어서 아래 5개 값을 채웁니다. (발급 방법은 바로 다음 섹션 참고)

```bash
TELEGRAM_BOT_TOKEN=       # 텔레그램 봇 토큰
TELEGRAM_CHAT_ID=         # 알림 받을 채팅 ID
ANTHROPIC_API_KEY=        # Claude API 키
ALPHA_VANTAGE_API_KEY=    # Alpha Vantage API 키
FMP_API_KEY=              # Financial Modeling Prep API 키
```

```bash
# 3. 실제로 한 번 실행해서 텔레그램으로 리포트가 오는지 확인
npm run report:local
```

여기까지 되면 준비 끝입니다. 이제 [GitHub Actions 배포](#매일-자동-실행되게-배포하기-github-actions) 섹션으로 넘어가서 "매일 자동 실행"만 설정하면 됩니다.

---

## API 키는 어디서 받나요?

| 키 | 발급처 | 비용 |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | 텔레그램 앱에서 [@BotFather](https://t.me/BotFather)에게 `/newbot` 전송 → 토큰 발급 | 무료 |
| `TELEGRAM_CHAT_ID` | 봇과 대화를 시작한 뒤, `https://api.telegram.org/bot<토큰>/getUpdates` 접속 → `chat.id` 값 확인 | 무료 |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → **Settings → API Keys → Create Key** | 사용량 기반 과금 (별도 결제 수단 등록 필요, Claude Pro 구독과는 무관) |
| `ALPHA_VANTAGE_API_KEY` | [alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key) (이메일만 있으면 즉시 발급) | 무료 (일 25회 제한) |
| `FMP_API_KEY` | [site.financialmodelingprep.com/developer/docs](https://site.financialmodelingprep.com/developer/docs) (가입 후 대시보드에서 확인) | 무료 (일 250회 제한) |

> **참고**: Claude API(`ANTHROPIC_API_KEY`)는 Claude Pro 구독료와 완전히 별개의 결제 체계입니다. Console에서 크레딧을 충전(예: $5)해야 API를 호출할 수 있습니다. 이 프로젝트는 하루 1회, 짧은 요청 1건만 보내므로 실제 비용은 매우 적습니다.

---

## 로컬에서 테스트해보기

```bash
# 최초 1회: Playwright 브라우저 설치
npx playwright install --with-deps chromium

# 실제 리포트 생성 + 텔레그램 발송
npm run report:local

# 단위 테스트 실행 (실제 API 호출 없음, 전부 mock)
npm test

# 문법 검사
npm run lint
```

`npm run report:local`을 실행하면 콘솔에 각 단계 로그가 출력되고, 성공하면 실제 텔레그램 채팅방에 메시지가 도착합니다.

---

## 매일 자동 실행되게 배포하기 (GitHub Actions)

1. 이 저장소를 GitHub에 push 합니다.
2. GitHub 저장소 페이지 → **Settings → Secrets and variables → Actions → New repository secret**
3. 아래 5개를 하나씩 등록합니다 (이름은 정확히 일치해야 함).
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `ANTHROPIC_API_KEY`
   - `ALPHA_VANTAGE_API_KEY`
   - `FMP_API_KEY`
4. **Actions** 탭 → `Daily Market Report` 워크플로 → **Run workflow** 버튼으로 수동 실행해서 정상 동작하는지 먼저 확인합니다.
5. 이후로는 매일 **00:00 UTC (= 오전 9시 KST)**에 자동으로 실행됩니다.

> GitHub Actions cron은 트래픽이 몰리면 몇 분 정도 지연될 수 있습니다 (정확히 09:00:00에 오지 않을 수 있음).

---

## 동작 원리 (아키텍처)

```
GitHub Actions (매일 00:00 UTC = 09:00 KST 자동 실행)
        │
        ▼
runDailyReport  ─── 전체 과정을 지휘하는 파이프라인
   │
   ├─ collectUsMarket        미국 지수(S&P500/Nasdaq/Dow) ── FMP API
   ├─ collectTreasuryYield   미국 10년물 국채금리        ── Alpha Vantage API
   ├─ scrapeKrMarket         코스피/코스닥 지수           ── Playwright(네이버 증권)
   ├─ scrapeForeignFlow      외국인·기관 순매수           ── Playwright(네이버 증권)
   │        (위 두 스크래핑은 브라우저 1개, 페이지 2개로 동시에 진행)
   │
   ├─ generateInsight        수집된 데이터를 Claude에게 넘겨 인사이트 생성
   ├─ formatReport            위 결과를 텔레그램 메시지 형태로 조립
   └─ sendTelegramMessage     텔레그램으로 최종 발송
```

**핵심 설계 원칙: 일부가 실패해도 전체가 멈추지 않습니다.**
예를 들어 네이버 증권 스크래핑이 실패해도, 나머지(미국 증시·국채금리·Claude 인사이트)는 정상적으로 발송되고 실패한 항목만 "⚠️ 데이터를 가져오지 못했습니다"로 표시됩니다.

---

## 자주 묻는 질문 / 문제 해결

**Q. 텔레그램 메시지가 아예 안 와요.**
`TELEGRAM_CHAT_ID`가 그룹/채널이라면, 봇을 그 대화방에 먼저 초대(추가)해야 메시지를 보낼 수 있습니다. 1:1 대화라면 봇에게 먼저 아무 메시지나 보낸 이력이 있어야 `chat_id`를 조회할 수 있습니다.

**Q. Alpha Vantage에서 `Note` 에러 / 호출 한도 초과가 떠요.**
무료 티어는 하루 25회, 분당 5회로 매우 제한적입니다. 이 프로젝트는 하루 호출을 국채금리 조회 1회로 최소화했지만, 초과 시 해당 섹션만 생략되고 나머지는 정상 발송됩니다.

**Q. 국내 증시/외국인 동향 수치가 비어있어요.**
네이버 증권 페이지의 DOM 구조가 바뀌었을 수 있습니다. `src/config/constants.js`의 `NAVER_SELECTORS` 값을 실제 사이트 구조에 맞게 업데이트하세요.

**Q. Claude 인사이트 섹션이 "생성하지 못했습니다"로 나와요.**
① `ANTHROPIC_API_KEY`가 유효한지, ② Console에 결제 수단/크레딧이 등록되어 있는지, ③ 다른 모든 데이터 수집이 실패해서 인사이트를 만들 근거 자체가 없는 경우인지 확인하세요.

**Q. GitHub Actions에서 Playwright 관련 에러가 나요.**
워크플로가 자동으로 Chromium을 캐싱/설치하지만, 최초 실행 시에는 설치에 시간이 좀 걸립니다. `Actions` 탭에서 로그를 펼쳐 `Install Playwright` 스텝이 성공했는지 확인하세요.

---

## 보안 주의사항

- `.env` 파일은 `.gitignore`에 포함되어 있어 **절대 git에 커밋되지 않습니다.**
- 실제 운영 환경(GitHub Actions)에서는 `.env` 파일 대신 **GitHub Secrets**를 사용합니다.
- 텔레그램 봇 토큰 등 민감한 값이 어딘가에 노출된 적이 있다면, [BotFather](https://t.me/BotFather)에서 `/revoke` 명령으로 즉시 재발급받으세요.

---

## 프로젝트 구조

```
src/
├── config/       # 환경변수 로드(env.js), 상수(constants.js)
├── collectors/   # Alpha Vantage / FMP REST API 클라이언트 + 수집기
├── scrapers/     # Playwright 기반 네이버 증권 스크래퍼
├── analysis/     # Claude API 인사이트 생성
├── formatters/   # 텔레그램 메시지 포맷
├── notifiers/    # 텔레그램 발송
├── pipeline/     # 전체 오케스트레이션 (runDailyReport)
└── utils/        # 로깅, 재시도, rate limiter, 공통 결과 래핑

test/unit/        # 위 각 모듈에 대응하는 단위 테스트 (전부 mock, 실제 네트워크 호출 없음)
scripts/          # 로컬 실행 진입점 (npm run report:local)
.github/workflows/  # 매일 자동 실행되는 GitHub Actions 워크플로
```
