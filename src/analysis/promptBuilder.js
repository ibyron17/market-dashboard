function hasUsableData(sections) {
  return Object.values(sections).some((section) => section && section.status === 'ok');
}

function describeSection(title, section) {
  if (!section || section.status !== 'ok') {
    return `${title}: 데이터 없음`;
  }
  return `${title}: ${JSON.stringify(section.data)}`;
}

function summarizeIndustryTrends(section) {
  if (!section || section.status !== 'ok' || !section.data) {
    return '[업종별 등락]: 데이터 없음';
  }

  const { topRising, topFalling } = section.data;
  const rising = topRising ? topRising.slice(0, 3).map((i) => `${i.name}(${i.changeRate}%)`).join(', ') : '';
  const falling = topFalling ? topFalling.slice(0, 2).map((i) => `${i.name}(${i.changeRate}%)`).join(', ') : '';

  return `[업종별 등락]: 상승 ${rising} / 하락 ${falling}`;
}

function summarizeStockDetails(stockDetails) {
  if (!Array.isArray(stockDetails) || stockDetails.length === 0) {
    return '[종목 심화]: 데이터 없음';
  }

  const deviations = stockDetails
    .filter((item) => item.trend && item.trend.status === 'ok' && item.trend.data.trend)
    .map((item) => ({
      label: item.label,
      deviation: Math.abs(item.trend.data.trend.deviationPercent || 0),
      deviationPercent: item.trend.data.trend.deviationPercent,
      isAbove: item.trend.data.trend.isAbove,
    }))
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 6);

  if (deviations.length === 0) {
    return '[종목 심화]: 데이터 없음';
  }

  const summary = deviations.map((d) => `${d.label}(${d.isAbove ? '▲' : '▼'}${d.deviationPercent}%)`).join(', ');
  return `[종목 심화 (200일선 대비)]: ${summary}`;
}

function summarizeMacroIndicators(section) {
  if (!section || section.status !== 'ok' || !section.data || !section.data.indicators) {
    return '[FRED 거시지표]: 데이터 없음';
  }

  const { indicators } = section.data;
  const summary = indicators.slice(0, 5).map((i) => `${i.label}: ${i.latestValue}`).join(', ');
  return `[FRED 거시지표]: ${summary}`;
}

function summarizeNews(stockNews) {
  if (!stockNews || typeof stockNews !== 'object') {
    return '[뉴스]: 데이터 없음';
  }

  const headlines = [];
  Object.values(stockNews).forEach((newsItem) => {
    if (newsItem && newsItem.status === 'ok' && newsItem.data && newsItem.data.articles) {
      newsItem.data.articles.slice(0, 2).forEach((a) => {
        headlines.push(a.title);
      });
    }
  });

  if (headlines.length === 0) {
    return '[뉴스]: 데이터 없음';
  }

  return `[뉴스 헤드라인]: ${headlines.slice(0, 5).join(' | ')}`;
}

function summarizeSecFilings(secFilings) {
  if (!secFilings || typeof secFilings !== 'object') {
    return '[SEC 공시]: 데이터 없음';
  }

  const filings = [];
  Object.values(secFilings).forEach((filingItem) => {
    if (filingItem && filingItem.status === 'ok' && filingItem.data && filingItem.data.filings) {
      filingItem.data.filings.slice(0, 2).forEach((f) => {
        filings.push(`${f.symbol}:${f.form}(${f.filingDate})`);
      });
    }
  });

  if (filings.length === 0) {
    return '[SEC 공시]: 데이터 없음';
  }

  return `[SEC 공시]: ${filings.slice(0, 5).join(', ')}`;
}

function buildInsightPrompt(sections) {
  const lines = [
    describeSection('미국 증시', sections.usMarket),
    describeSection('VIX(변동성지수)', sections.vix),
    describeSection('국내 증시', sections.krMarket),
    describeSection('외국인·기관 동향', sections.foreignFlow),
    describeSection('미국 기준금리', sections.fedFunds),
    describeSection('10년물 국채금리', sections.treasury),
    describeSection('관심 기업 동향', sections.watchlist),
    summarizeIndustryTrends(sections.industryTrends),
    summarizeStockDetails(sections.stockDetails),
    summarizeMacroIndicators(sections.macroIndicators),
    summarizeNews(sections.stockNews),
    summarizeSecFilings(sections.secFilings),
  ];

  return [
    '아래는 오늘 수집된 시장 데이터다. 주식 투자를 처음 시작하는 초보자도 이해할 수 있도록',
    '쉬운 말로 4~6문장 분량의 인사이트를 한국어로 작성해줘.',
    '반드시 지켜야 할 규칙:',
    '1. 숫자를 임의로 지어내지 말고 주어진 데이터만 근거로 해석할 것.',
    '2. 특정 종목이나 지수에 대해 "사라", "팔아라", "매수/매도 추천" 등 투자 행동을 지시하는 표현은 절대 쓰지 말 것.',
    '3. 전문 용어(코스피, 순매수, 국채금리 등)를 쓸 때는 짧게 풀어서 설명할 것.',
    '4. 먼저 오늘 시장이 전반적으로 상승/하락/혼조 중 어떤 분위기였는지 요약하고, 그다음 눈에 띄는 부분을 설명할 것.',
    '5. "참고용 정보입니다", "투자 판단은 본인 책임입니다" 같은 면책 문구는 덧붙이지 말 것(대시보드 하단에 별도 안내 배너가 있음).',
    '데이터가 없는 항목은 언급하지 않아도 된다.',
    '',
    ...lines,
  ].join('\n');
}

module.exports = { buildInsightPrompt, hasUsableData };
