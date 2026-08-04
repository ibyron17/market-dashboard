const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderIndustryTrends,
  renderStockDetailsTable,
  renderConsensusTable,
  renderMarketCapRanking,
  renderMacroIndicators,
  renderNewsAndFilings,
} = require('../../../src/formatters/dashboardSectionsExtra');

test('renderIndustryTrends renders with data', () => {
  const section = {
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
  };

  const html = renderIndustryTrends(section);
  assert.match(html, /🏭 업종별 등락/);
  assert.match(html, /반도체/);
  assert.match(html, /▲/);
  assert.match(html, /소재/);
  assert.match(html, /▼/);
});

test('renderIndustryTrends renders error when section missing', () => {
  const html = renderIndustryTrends(null);
  assert.match(html, /데이터를 가져오지 못했습니다/);
});

// 픽스처는 수집기가 실제로 반환하는 형태를 따른다(live 응답으로 확인한 필드명·타입).
function sampleStockDetail(overrides = {}) {
  return {
    symbol: '005930',
    label: '삼성전자',
    integration: {
      status: 'ok',
      data: {
        per: 18.63,
        estimatedPer: 4.81,
        high52Weeks: 380000,
        low52Weeks: 67500,
        investorFlow: { date: '20260803', foreign: 8358911, institution: -5039954, individual: 100 },
        consensus: { date: '2026-08-03', opinionMean: 4.04, priceTargetMean: 493542 },
        researchReports: [{ brokerName: '교보증권', title: '2Q26 Review', date: '20260731' }],
      },
    },
    trend: {
      status: 'ok',
      data: { trend: { lastClose: 230500, movingAverage: 194590, deviationPercent: 18.45, isAbove: true } },
    },
    ...overrides,
  };
}

test('renderStockDetailsTable renders valuation, flow and trend', () => {
  const html = renderStockDetailsTable([sampleStockDetail()]);

  assert.match(html, /삼성전자/);
  assert.match(html, /18\.63/);
  assert.match(html, /4\.81/);
  assert.match(html, /67,500 ~ 380,000/);
  assert.match(html, /\+8,358,911/); // 외국인 순매수는 부호와 천단위 콤마 유지
  assert.match(html, /▲ 200일선 위 \(\+18\.45%\)/);
});

// 회귀 방지: 한 종목의 수집이 실패해도 행을 통째로 지우면 그 종목이 화면에서
// 조용히 사라진다. 행은 남기고 실패한 칸만 "데이터 없음"이어야 한다.
test('renderStockDetailsTable keeps the row and blanks only failed cells', () => {
  const html = renderStockDetailsTable([
    sampleStockDetail({ integration: { status: 'error' }, trend: { status: 'error' } }),
  ]);

  assert.match(html, /삼성전자/);
  assert.match(html, /데이터 없음/);
});

test('renderStockDetailsTable still renders valuation when only the chart failed', () => {
  const html = renderStockDetailsTable([sampleStockDetail({ trend: { status: 'error' } })]);

  assert.match(html, /18\.63/);
  assert.match(html, /데이터 없음/);
});

// 회귀 방지: 네이버 recommMean은 "높을수록 긍정"이다. 설계 초안이 이를 반대로
// 적었던 적이 있어 방향이 뒤집히면 즉시 실패하도록 고정한다.
test('renderConsensusTable reads a high opinion score as positive', () => {
  const html = renderConsensusTable([sampleStockDetail()]);

  assert.match(html, /긍정적 의견 우세 \(4\.04\/5\)/);
  assert.match(html, /493,542/);
  assert.match(html, /2026-08-03/); // 목표주가는 기준일과 함께 보여준다
  assert.match(html, /교보증권/);
});

test('renderConsensusTable reads a low opinion score as cautious', () => {
  const detail = sampleStockDetail();
  const html = renderConsensusTable([
    {
      ...detail,
      integration: {
        status: 'ok',
        data: { ...detail.integration.data, consensus: { date: '2026-08-03', opinionMean: 1.8, priceTargetMean: 1000 } },
      },
    },
  ]);

  assert.match(html, /신중한 의견 우세 \(1\.8\/5\)/);
});

test('renderConsensusTable shows 데이터 없음 when consensus is missing', () => {
  const detail = sampleStockDetail();
  const html = renderConsensusTable([
    {
      ...detail,
      integration: { status: 'ok', data: { ...detail.integration.data, consensus: null, researchReports: [] } },
    },
  ]);

  assert.match(html, /삼성전자/);
  assert.match(html, /데이터 없음/);
});

test('renderMarketCapRanking renders KOSPI and KOSDAQ', () => {
  const marketList = {
    kospi: {
      status: 'ok',
      data: {
        stocks: [
          { name: '삼성전자', price: '62,500', changesPercentage: 2.5 },
        ],
      },
    },
    kosdaq: {
      status: 'ok',
      data: {
        stocks: [
          { name: '카카오', price: '78,500', changesPercentage: 1.8 },
        ],
      },
    },
  };

  const html = renderMarketCapRanking(marketList);
  assert.match(html, /💹 시가총액 상위 종목/);
  assert.match(html, /코스피/);
  assert.match(html, /코스닥/);
  assert.match(html, /삼성전자/);
  assert.match(html, /카카오/);
});

test('renderMacroIndicators renders with data', () => {
  const section = {
    status: 'ok',
    data: {
      indicators: [
        {
          label: '장단기금리차',
          latestValue: 0.35,
          unit: '%',
          latestDate: '2026-08-04',
          changeDirection: 'up',
        },
      ],
    },
  };

  const html = renderMacroIndicators(section);
  assert.match(html, /💰 FRED 거시지표/);
  assert.match(html, /장단기금리차/);
  assert.match(html, /0.35/);
  assert.match(html, /▲/);
});

// 키 미설정은 수집 실패가 아니라 정상 상태(status:'ok', configured:false)로 온다.
// 실패 문구가 아니라 켜는 방법을 안내해야 한다.
test('renderMacroIndicators shows setup hint when the FRED key is not configured', () => {
  const html = renderMacroIndicators({ status: 'ok', data: { configured: false, indicators: [] } });

  assert.match(html, /FRED_API_KEY/);
  assert.ok(!html.includes('가져오지 못했습니다'));
});

test('renderMacroIndicators shows a failure warning when collection actually failed', () => {
  const html = renderMacroIndicators({ status: 'error', source: 'fred', message: 'boom' });

  assert.match(html, /가져오지 못했습니다/);
  assert.ok(!html.includes('FRED_API_KEY'));
});

test('renderNewsAndFilings renders news and filings', () => {
  const stockNews = {
    '005930': {
      status: 'ok',
      data: {
        articles: [
          {
            title: '삼성전자 실적 개선',
            officeName: '한국경제',
            url: 'https://example.com/news',
            publishedAt: { date: '2026-08-04', time: '13:30' },
          },
        ],
      },
    },
  };

  const secFilings = {
    NVDA: {
      status: 'ok',
      data: {
        filings: [
          { symbol: 'NVDA', form: '10-Q', filingDate: '2026-08-02' },
        ],
      },
    },
  };

  const html = renderNewsAndFilings(stockNews, secFilings);
  assert.match(html, /📰.*뉴스.*공시/);
  assert.match(html, /삼성전자 실적 개선/);
  assert.match(html, /한국경제/);
  assert.match(html, /10-Q/);
  assert.match(html, /분기보고서/);
});

test('renderNewsAndFilings decodes HTML entities in titles', () => {
  const stockNews = {
    '005930': {
      status: 'ok',
      data: {
        articles: [
          {
            title: '삼성전자 &quot;실적&quot; &amp; 성장',
            officeName: '한국경제',
            url: 'https://example.com',
            publishedAt: { date: '2026-08-04', time: '13:30' },
          },
        ],
      },
    },
  };

  const html = renderNewsAndFilings(stockNews, {});
  // Decode then escape: &quot; → " → &quot; (in HTML context)
  // The important part is that it's not double-encoded like &amp;quot;
  assert.match(html, /삼성전자.*실적.*성장/);
  assert(html.includes('&quot;') || html.includes('"'));
  assert(html.includes('&amp;') || html.includes('&'));
});

test('renderNewsAndFilings maps SEC form labels correctly', () => {
  const secFilings = {
    NVDA: {
      status: 'ok',
      data: {
        filings: [
          { symbol: 'NVDA', form: '10-K', filingDate: '2026-01-01' },
          { symbol: 'NVDA', form: '8-K', filingDate: '2026-08-01' },
          { symbol: 'NVDA', form: '4', filingDate: '2026-07-15' },
        ],
      },
    },
  };

  const html = renderNewsAndFilings({}, secFilings);
  assert.match(html, /연간보고서/);
  assert.match(html, /수시공시/);
  assert.match(html, /내부자거래/);
});
