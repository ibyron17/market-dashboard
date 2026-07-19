# market-dashboard

평일(월~금) **오전 7시(한국 시간)**에 미국/국내 증시 현황, 외국인·기관 매매 동향, 잘 알려진 대형 기업들의 주가, Claude AI 인사이트를 자동으로 수집해서 **웹 대시보드**로 만들고, 텔레그램으로는 그 대시보드 링크만 보내주는 개인용 자동화 시스템입니다.

주식 투자를 처음 접하는 사람도 이해할 수 있도록, 대시보드의 각 카드에는 용어 설명과 "오늘 수치가 상승인지 하락인지" 해석 라벨이 붙어 있습니다. **다만 이 대시보드는 정보 제공용이며 투자 조언이 아닙니다.** 특정 종목의 매수/매도를 추천하지 않으며, 모든 투자 판단과 책임은 이용자 본인에게 있습니다.

- 📊 **대시보드**: `https://<GitHub 계정>.github.io/market-dashboard/` — 평일마다 최신 리포트 1건으로 갱신
- 📩 **텔레그램**: 평일 아침 "오늘의 대시보드가 준비됐습니다 + 링크" 형태의 짧은 알림만 수신

한 번 배포해두면 사람이 매일 실행할 필요 없이 GitHub Actions가 대신 실행하고, 대시보드를 새로 배포한 뒤 텔레그램으로 링크를 보냅니다.

---

## 목차

1. [빠른 시작 (5분)](#빠른-시작-5분)
2. [API 키는 어디서 받나요?](#api-키는-어디서-받나요)
3. [로컬에서 테스트해보기](#로컬에서-테스트해보기)
4. [매일 자동 실행되게 배포하기 (GitHub Actions + Pages)](#매일-자동-실행되게-배포하기-github-actions--pages)
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
# 3. 실제로 한 번 실행해서 대시보드가 생성되고 텔레그램으로 링크가 오는지 확인
npm run report:local
```

실행하면 `dist/index.html`이 로컬에 생성되고(브라우저로 열어서 바로 확인 가능), 텔레그램으로는 대시보드 링크 알림이 도착합니다.

여기까지 되면 준비 끝입니다. 이제 [GitHub Actions + Pages 배포](#매일-자동-실행되게-배포하기-github-actions--pages) 섹션으로 넘어가서 "매일 자동 실행 + 대시보드 자동 배포"를 설정하면 됩니다.

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

`npm run report:local`을 실행하면 콘솔에 각 단계 로그가 출력되고, 성공하면 `dist/index.html`이 생성되고 실제 텔레그램 채팅방에 링크 알림이 도착합니다.

---

## 매일 자동 실행되게 배포하기 (GitHub Actions + Pages)

> **중요**: GitHub Pages는 **Public 저장소 + Free 플랜** 조합에서만 무료로 쓸 수 있습니다. 저장소가 private이라면 먼저 **Settings → 맨 아래 Danger Zone → Change visibility → Public**으로 전환해야 합니다. (대시보드 URL 자체는 로그인 없이 누구나 볼 수 있게 됩니다. 소스코드에는 시크릿 값이 없으므로 안전하지만, 내용 자체가 공개된다는 점은 유의하세요.)

1. 이 저장소를 GitHub에 push 하고, 필요하다면 위처럼 Public으로 전환합니다.
2. GitHub 저장소 페이지 → **Settings → Pages** → **Build and deployment → Source**를 **"GitHub Actions"**로 선택합니다. (한 번만 설정하면 됩니다)
3. **Settings → Secrets and variables → Actions → New repository secret**에서 아래 5개를 등록합니다 (이름은 정확히 일치해야 함).
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `ANTHROPIC_API_KEY`
   - `ALPHA_VANTAGE_API_KEY`
   - `FMP_API_KEY`
4. **Actions** 탭 → `Daily Market Report` 워크플로 → **Run workflow** 버튼으로 수동 실행해서 정상 동작하는지 먼저 확인합니다.
5. 실행이 끝나면 `https://<GitHub 계정>.github.io/market-dashboard/`에서 대시보드를 확인할 수 있고, 이후로는 **일~목 22:00 UTC (= 평일 월~금 오전 7시 KST)**에 자동으로 실행됩니다. 주말 아침에는 발행하지 않습니다.

> GitHub Actions cron은 트래픽이 몰리면 몇 분 정도 지연될 수 있습니다 (정확히 07:00:00에 오지 않을 수 있음).

---

## 동작 원리 (아키텍처)

GitHub Actions 워크플로는 3개의 잡으로 나뉘어 **순서대로** 실행됩니다. 대시보드가 실제로 배포되기 전에 텔레그램 링크가 먼저 도착하는 일이 없도록, 알림 발송은 배포가 끝난 뒤 마지막에만 실행됩니다.

```
1) generate   (npm run generate:dashboard)
   ├─ collectUsMarket        미국 지수(S&P500/나스닥종합/다우존스) ── FMP API
   ├─ collectVix             VIX 변동성지수(공포지수)             ── FMP API
   ├─ collectTreasuryYield   미국 10년물 국채금리                 ── Alpha Vantage API
   ├─ collectFedFundsRate    미국 기준금리 + 최근 12개월 추이      ── Alpha Vantage API
   ├─ scrapeKrMarket         코스피/코스닥 지수                    ── Playwright(네이버 증권)
   ├─ scrapeForeignFlow      외국인·기관 순매수                    ── Playwright(네이버 증권)
   │        (위 두 스크래핑은 브라우저 1개, 페이지 2개로 동시에 진행)
   ├─ collectWatchlist       테마 5종(반도체/전력/배터리/건설/레저) 관심 기업
   │                         국내 3곳 ── 네이버 시세 API / 해외 2곳 ── Alpha Vantage API
   ├─ generateInsight        수집된 데이터를 Claude에게 넘겨 초보자용 인사이트 생성(매수/매도 추천 금지 가드레일 적용)
   ├─ dist/index.html 생성                (대시보드 HTML, Pages 아티팩트로 업로드)
   └─ artifacts/telegram-message.txt 생성 (아직 전송 X, 잡 간 전달용 아티팩트로 업로드)
        │
        ▼
2) deploy     dist/를 GitHub Pages에 실제로 배포 (대시보드 URL이 이 시점에 살아남)
        │
        ▼
3) notify     (npm run notify:dashboard)
   └─ artifacts/telegram-message.txt를 읽어 텔레그램으로 발송
```

**핵심 설계 원칙 1 — 일부가 실패해도 전체가 멈추지 않습니다.**
예를 들어 네이버 증권 스크래핑이 실패해도, 대시보드는 나머지 데이터(미국 증시·국채금리·Claude 인사이트)로 정상 생성되고 실패한 항목만 "⚠️ 데이터를 가져오지 못했습니다"로 표시됩니다. 텔레그램 알림에도 실패한 항목 수가 함께 표시됩니다.

**핵심 설계 원칙 2 — 알림은 배포가 끝난 뒤에만 발송됩니다.**
`generate` 잡은 텔레그램 메시지를 파일로만 써두고 절대 전송하지 않습니다. `deploy` 잡이 성공적으로 끝나야만 `notify` 잡이 실행되어 그 파일을 읽어 전송하므로, 링크를 받았을 때 항상 대시보드가 이미 열람 가능한 상태입니다.

**핵심 설계 원칙 3 — 투자 조언이 아닌 참고 정보로만 제공됩니다.**
대시보드 하단에는 "투자 조언이 아닙니다" 배너가 항상 표시되고, Claude 인사이트 프롬프트에는 특정 종목의 매수/매도를 추천하지 말라는 규칙이 명시되어 있습니다.

### 대시보드 화면 구성 (초보자를 위한 안내)

밝은 테마를 기본으로 하고, 상승/하락 색상은 국내 증권사 앱과 동일하게 상승은 빨강(▲), 하락은 파랑(▼)으로 표시합니다.

1. 🤖 AI 인사이트 — 오늘 시장 분위기를 가장 먼저 초보자 눈높이로 풀어서 설명 (최상단 배치)
2. 🇺🇸 미국 증시 / 😨 VIX(변동성지수) — 지수가 무엇을 의미하는지 설명 + 상승▲/하락▼/보합 해석 라벨, VIX는 20 기준 시장 불안 여부 해설 포함
3. 🇰🇷 국내 증시 / 💱 외국인·기관 동향
4. 🏦 미국 기준금리(최근 12개월 추이 미니 차트 포함) / 💵 미국 10년 만기 국채금리 — 각 지표가 왜 중요한지에 대한 설명
5. 🏢 오늘의 관심 기업 — 5개 테마(반도체·전력·배터리·건설·레저)를 탭으로 전환하며 테마별 국내 기업 3곳 + 해외 기업 2곳의 오늘 주가 변동을 확인 (매수/매도 추천 아님, 참고용 — 사용자가 고른 목록이 아니라 `src/config/constants.js`의 `WATCHLIST_THEMES`에 고정된 목록)
6. ⚠️ 하단 안내 배너

---

## 자주 묻는 질문 / 문제 해결

**Q. 텔레그램 메시지가 아예 안 와요.**
`TELEGRAM_CHAT_ID`가 그룹/채널이라면, 봇을 그 대화방에 먼저 초대(추가)해야 메시지를 보낼 수 있습니다. 1:1 대화라면 봇에게 먼저 아무 메시지나 보낸 이력이 있어야 `chat_id`를 조회할 수 있습니다.

**Q. Alpha Vantage에서 `Note` 에러 / 호출 한도 초과가 떠요.**
무료 티어는 하루 25회에 더해 "초당 1회" 버스트 제한이 있습니다. 이 프로젝트의 하루 호출은 국채금리 1회 + 기준금리 1회 + 관심 기업 10회 = 12회 수준이며(재시도 시 소폭 증가), 모든 호출이 공용 리미터(분당 5회 + 호출 간 최소 2초 간격, 재시도 포함)를 거치므로 동시에 몰리지 않습니다. 한도 초과 시 해당 섹션만 생략되고 나머지는 정상 발송됩니다.

**Q. 관심 기업/기준금리는 왜 FMP가 아니라 Alpha Vantage를 쓰나요?**
FMP 무료 키는 `/quote`를 인기 종목 일부(NVDA, TSLA 등)에만 허용하고 나머지 심볼(GEV, NEE 등)에는 402(프리미엄 전용)를 반환합니다. 또 `/economic-indicators`의 기준금리 값이 수개월 지연되어 도착했습니다. 두 항목 모두 종목 제한이 없고 값이 최신인 Alpha Vantage로 전환했습니다.

**Q. 국내 증시/외국인 동향 수치가 비어있어요.**
네이버 증권 페이지의 DOM 구조가 바뀌었을 수 있습니다. `src/config/constants.js`의 `NAVER_SELECTORS` 값을 실제 사이트 구조에 맞게 업데이트하세요.

**Q. Claude 인사이트 섹션이 "생성하지 못했습니다"로 나와요.**
① `ANTHROPIC_API_KEY`가 유효한지, ② Console에 결제 수단/크레딧이 등록되어 있는지, ③ 다른 모든 데이터 수집이 실패해서 인사이트를 만들 근거 자체가 없는 경우인지 확인하세요.

**Q. GitHub Actions에서 Playwright 관련 에러가 나요.**
워크플로가 자동으로 Chromium을 캐싱/설치하지만, 최초 실행 시에는 설치에 시간이 좀 걸립니다. `Actions` 탭에서 로그를 펼쳐 `Install Playwright` 스텝이 성공했는지 확인하세요.

**Q. 대시보드 URL이 404가 떠요.**
① 저장소가 Public인지, ② **Settings → Pages → Source**가 "GitHub Actions"로 설정되어 있는지, ③ 워크플로가 최소 1번 성공적으로 끝까지 실행됐는지(Actions 탭에서 `deploy` 잡까지 초록불) 확인하세요.

---

## 보안 주의사항

- `.env` 파일은 `.gitignore`에 포함되어 있어 **절대 git에 커밋되지 않습니다.**
- 실제 운영 환경(GitHub Actions)에서는 `.env` 파일 대신 **GitHub Secrets**를 사용합니다.
- 텔레그램 봇 토큰 등 민감한 값이 어딘가에 노출된 적이 있다면, [BotFather](https://t.me/BotFather)에서 `/revoke` 명령으로 즉시 재발급받으세요.

---

## 프로젝트 구조

```
src/
├── config/       # 환경변수 로드(env.js), 상수(constants.js — 지수/관심기업 티커 목록 포함)
├── collectors/   # Alpha Vantage / FMP REST API 클라이언트 + 수집기 (미국 지수, VIX, 국채금리, 기준금리, 관심 기업)
├── scrapers/     # Playwright 기반 네이버 증권 스크래퍼
├── analysis/     # Claude API 인사이트 생성 (초보자용 설명 + 매수/매도 추천 금지 가드레일)
├── formatters/   # 대시보드 HTML 포맷(dashboardFormatter/dashboardSections/glossary) + 텔레그램 링크 메시지 포맷
├── notifiers/    # 대시보드 파일 저장 + 텔레그램 발송
├── pipeline/     # generateDashboard(생성만) / sendDashboardNotification(발송만) — 두 단계로 분리
└── utils/        # 로깅, 재시도, rate limiter, 공통 결과 래핑, HTML 이스케이프/해석 라벨, 대시보드 URL 계산

test/unit/        # 위 각 모듈에 대응하는 단위 테스트 (전부 mock, 실제 네트워크/파일시스템 호출 없음)
scripts/          # runLocal.js(로컬용, 생성+발송 한번에) / generateDashboard.js / notifyDashboard.js (CI 각 잡의 진입점)
dist/             # 빌드 산출물(대시보드 HTML) — git에는 커밋되지 않음, CI가 매번 새로 생성
.github/workflows/  # 매일 자동 실행 + 대시보드 배포용 GitHub Actions 워크플로
```
