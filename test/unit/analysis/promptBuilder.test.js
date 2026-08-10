const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInsightPrompt, hasUsableData } = require('../../../src/analysis/promptBuilder');

test('hasUsableData returns true when at least one section succeeded', () => {
  const sections = {
    usMarket: { status: 'ok', data: {} },
    krMarket: { status: 'error' },
  };
  assert.equal(hasUsableData(sections), true);
});

test('hasUsableData returns false when every section failed', () => {
  const sections = {
    usMarket: { status: 'error' },
    krMarket: { status: 'error' },
  };
  assert.equal(hasUsableData(sections), false);
});

test('buildInsightPrompt includes data for ok sections and "데이터 없음" for failed ones', () => {
  const sections = {
    usMarket: { status: 'ok', data: { indices: [{ symbol: 'SPY', price: 500 }] } },
    krMarket: { status: 'error', error: 'timeout' },
  };

  const prompt = buildInsightPrompt(sections);

  assert.match(prompt, /SPY/);
  assert.match(prompt, /\[국내 증시\]: 데이터 없음/);
});

test('buildInsightPrompt forbids buy/sell recommendations and redundant disclaimer sentences', () => {
  const prompt = buildInsightPrompt({ usMarket: { status: 'ok', data: {} } });

  assert.match(prompt, /매수\/매도 추천/);
  assert.match(prompt, /면책 문구는 덧붙이지 말 것/);
});

test('buildInsightPrompt includes VIX and Fed funds rate data when present', () => {
  const sections = {
    vix: { status: 'ok', data: { price: 18.4 } },
    fedFunds: { status: 'ok', data: { rate: 3.63 } },
  };

  const prompt = buildInsightPrompt(sections);

  assert.match(prompt, /\[VIX\(변동성지수\)\]: .*18\.4/);
  assert.match(prompt, /\[미국 기준금리\]: .*3\.63/);
});

test('buildInsightPrompt includes watchlist data when present', () => {
  const sections = {
    watchlist: {
      status: 'ok',
      data: { themes: [{ key: 'semiconductor', label: '반도체', companies: [{ symbol: 'NVDA', price: 130 }] }] },
    },
  };

  const prompt = buildInsightPrompt(sections);

  assert.match(prompt, /NVDA/);
  assert.match(prompt, /\[관심 기업\]/);
});

// 픽스처는 수집기가 실제로 반환하는 형태를 따른다(avTickerQuote/fetchKrTickerQuote는
// label·symbol·price·changesPercentage·currency를 모두 채운다).
function watchlistSection() {
  return {
    status: 'ok',
    data: {
      themes: [
        {
          key: 'semiconductor',
          label: '반도체',
          companies: [
            { label: '삼성전자', symbol: '005930', price: 71800, changesPercentage: 1.23, currency: 'KRW' },
            { label: '엔비디아', symbol: 'NVDA', price: 182.44, changesPercentage: -0.45, currency: 'USD' },
          ],
        },
        {
          key: 'battery',
          label: '배터리',
          companies: [
            { label: 'LG에너지솔루션', symbol: '373220', price: 402000, changesPercentage: 0, currency: 'KRW' },
          ],
        },
      ],
    },
  };
}

// 안전장치: JSON을 걷어내면서 값까지 조용히 빠뜨리는 것이 이 리팩토링의 가장 큰 위험이다.
// 종목명·주가·등락률·테마가 하나라도 누락되면 실패해야 한다.
test('keeps every company name, price and change rate when compacting the watchlist', () => {
  const prompt = buildInsightPrompt({ watchlist: watchlistSection() });

  for (const name of ['삼성전자', '엔비디아', 'LG에너지솔루션']) {
    assert.match(prompt, new RegExp(name));
  }
  for (const theme of ['반도체', '배터리']) {
    assert.match(prompt, new RegExp(theme));
  }
  assert.match(prompt, /71800원 \+1\.23%/);
  assert.match(prompt, /182\.44달러 -0\.45%/);
  assert.match(prompt, /402000원 0%/); // 보합(0%)도 부호 없이 그대로 남아야 한다
  assert.ok(!prompt.includes('undefined'));
});

test('falls back to the ticker symbol so a company is never rendered as undefined', () => {
  const sections = {
    watchlist: {
      status: 'ok',
      data: { themes: [{ label: '반도체', companies: [{ symbol: 'NVDA', price: 130, currency: 'USD' }] }] },
    },
    usMarket: { status: 'ok', data: { indices: [{ symbol: '^GSPC', price: 6218.43 }] } },
  };

  const prompt = buildInsightPrompt(sections);

  assert.match(prompt, /NVDA 130달러/);
  assert.match(prompt, /\^GSPC 6218\.43/);
  assert.ok(!prompt.includes('undefined'));
});

// 12개월 시계열을 요약하면서 값을 잘라내면 금리 흐름 해석이 달라진다.
test('keeps every fed funds history value and the date range that anchors them', () => {
  const history = Array.from({ length: 12 }, (_, index) => ({
    date: `2026-${String(index + 1).padStart(2, '0')}-01`,
    value: 4 + index * 0.1,
  }));
  const prompt = buildInsightPrompt({
    fedFunds: { status: 'ok', data: { rate: 5.1, date: '2026-12-01', history } },
  });

  assert.match(prompt, /최근 12개월\(2026-01-01~2026-12-01\)/);
  for (const point of history) {
    assert.match(prompt, new RegExp(String(point.value).replace('.', '\\.')));
  }
});

test('compacting removes JSON scaffolding without dropping section labels', () => {
  const prompt = buildInsightPrompt({ watchlist: watchlistSection() });

  assert.ok(!prompt.includes('"companies"'));
  assert.ok(!prompt.includes('"currency"'));
  assert.ok(!prompt.includes('semiconductor')); // theme.key는 label과 중복이라 제거
});

// 회귀 방지: 지수는 등락률뿐 아니라 포인트 변화도 정보다. 요약하면서 change를
// 빠뜨리면 "코스피가 몇 포인트 올랐는지"가 통째로 사라진다.
test('keeps both the point change and the percent change for KR indices', () => {
  const prompt = buildInsightPrompt({
    krMarket: {
      status: 'ok',
      data: {
        kospi: { value: '3,204.11', change: '+18.2', changePercent: '+0.57%' },
        kosdaq: { value: '812.44', change: '-3.1', changePercent: '-0.38%' },
      },
    },
  });

  assert.match(prompt, /코스피 3,204\.11 \(\+18\.2, \+0\.57%\)/);
  assert.match(prompt, /코스닥 812\.44 \(-3\.1, -0\.38%\)/);
});

test('buildInsightPrompt includes industry trends summary', () => {
  const sections = {
    industryTrends: {
      status: 'ok',
      data: {
        topRising: [
          { name: '반도체', changeRate: 5.23 },
          { name: 'IT', changeRate: 4.12 },
          { name: '통신', changeRate: 3.45 },
        ],
        topFalling: [
          { name: '소재', changeRate: -2.34 },
          { name: '부동산', changeRate: -3.45 },
        ],
      },
    },
  };

  const prompt = buildInsightPrompt(sections);
  assert.match(prompt, /업종별 등락/);
  assert.match(prompt, /반도체/);
  assert.match(prompt, /소재/);
});

test('buildInsightPrompt includes stock details with 200-day deviation', () => {
  const sections = {
    stockDetails: [
      {
        label: '삼성전자',
        trend: {
          status: 'ok',
          data: {
            trend: {
              isAbove: true,
              deviationPercent: 18.45,
            },
          },
        },
      },
      {
        label: 'SK하이닉스',
        trend: {
          status: 'ok',
          data: {
            trend: {
              isAbove: false,
              deviationPercent: -12.5,
            },
          },
        },
      },
    ],
  };

  const prompt = buildInsightPrompt(sections);
  assert.match(prompt, /종목 심화/);
  assert.match(prompt, /200일선 대비/);
  assert.match(prompt, /삼성전자/);
  assert.match(prompt, /SK하이닉스/);
});

test('buildInsightPrompt includes FRED macro indicators summary', () => {
  const sections = {
    macroIndicators: {
      status: 'ok',
      data: {
        indicators: [
          { label: '장단기금리차', latestValue: 0.35 },
          { label: '실업률', latestValue: 4.2 },
        ],
      },
    },
  };

  const prompt = buildInsightPrompt(sections);
  assert.match(prompt, /FRED 거시지표/);
  assert.match(prompt, /0.35/);
  assert.match(prompt, /4.2/);
});

test('buildInsightPrompt includes news headlines summary', () => {
  const sections = {
    stockNews: {
      '005930': {
        status: 'ok',
        data: {
          articles: [
            { title: '삼성전자 실적 개선' },
            { title: '반도체 산업 호조' },
          ],
        },
      },
    },
  };

  const prompt = buildInsightPrompt(sections);
  assert.match(prompt, /뉴스 헤드라인/);
  assert.match(prompt, /삼성전자 실적 개선/);
});

test('buildInsightPrompt includes SEC filings summary', () => {
  const sections = {
    secFilings: {
      NVDA: {
        status: 'ok',
        data: {
          filings: [
            { symbol: 'NVDA', form: '10-Q', filingDate: '2026-08-02' },
          ],
        },
      },
    },
  };

  const prompt = buildInsightPrompt(sections);
  assert.match(prompt, /SEC 공시/);
  assert.match(prompt, /NVDA/);
  assert.match(prompt, /10-Q/);
});
