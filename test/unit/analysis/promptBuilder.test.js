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
  assert.match(prompt, /국내 증시: 데이터 없음/);
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

  assert.match(prompt, /VIX\(변동성지수\): .*18\.4/);
  assert.match(prompt, /미국 기준금리: .*3\.63/);
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
  assert.match(prompt, /관심 기업 동향/);
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
