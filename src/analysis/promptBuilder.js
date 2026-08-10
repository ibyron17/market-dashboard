function hasUsableData(sections) {
  return Object.values(sections).some((section) => section && section.status === 'ok');
}

const NO_DATA = '데이터 없음';

function unwrapData(section) {
  return section && section.status === 'ok' && section.data ? section.data : null;
}

function formatSignedPercent(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return null;
  }
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric}%`;
}

// 라벨은 수집기가 항상 채우지만, 비어 있으면 프롬프트에 undefined가 찍혀 모델이 어느
// 종목인지 알 수 없게 된다. 종목코드로라도 식별은 유지한다.
function resolveDisplayName(item) {
  return item.label || item.symbol || NO_DATA;
}

// 아래 요약 함수들은 값은 그대로 두고 JSON 껍데기(필드명·따옴표·중괄호)와 인사이트
// 작성에 쓰이지 않는 필드(symbol, theme.key)만 걷어낸다. 통화 코드처럼 사람이 읽는
// 형태가 따로 있는 값은 대시보드와 같은 표기(KRW → 원)로 바꿔 정보를 보존한다.
function summarizeUsMarket(section) {
  const data = unwrapData(section);
  if (!data || !Array.isArray(data.indices) || data.indices.length === 0) {
    return `[미국 증시]: ${NO_DATA}`;
  }

  const indices = data.indices.map((index) => {
    const percent = formatSignedPercent(index.changesPercentage);
    return `${resolveDisplayName(index)} ${index.price ?? NO_DATA}${percent ? ` (${percent})` : ''}`;
  });
  return `[미국 증시]: ${indices.join(', ')}`;
}

function summarizeVix(section) {
  const data = unwrapData(section);
  if (!data || data.price == null) {
    return `[VIX(변동성지수)]: ${NO_DATA}`;
  }

  const percent = formatSignedPercent(data.changesPercentage);
  return `[VIX(변동성지수)]: ${data.price}${percent ? ` (${percent})` : ''}`;
}

function summarizeKrMarket(section) {
  const data = unwrapData(section);
  if (!data) {
    return `[국내 증시]: ${NO_DATA}`;
  }

  const describeIndex = (label, index) => {
    if (!index || index.value == null) {
      return `${label} ${NO_DATA}`;
    }
    const change = [index.change, index.changePercent].filter(Boolean).join(', ');
    return `${label} ${index.value}${change ? ` (${change})` : ''}`;
  };
  return `[국내 증시]: ${describeIndex('코스피', data.kospi)}, ${describeIndex('코스닥', data.kosdaq)}`;
}

function summarizeForeignFlow(section) {
  const data = unwrapData(section);
  if (!data) {
    return `[외국인·기관 동향]: ${NO_DATA}`;
  }

  const describeFlow = (label, value) => `${label} ${value == null ? NO_DATA : `${value}억 원`}`;
  return `[외국인·기관 동향]: ${describeFlow('외국인 순매수', data.foreignNetBuy)}, ${describeFlow('기관 순매수', data.institutionNetBuy)}`;
}

function summarizeFedFunds(section) {
  const data = unwrapData(section);
  if (!data || data.rate == null) {
    return `[미국 기준금리]: ${NO_DATA}`;
  }

  const parts = [`${data.rate}%${data.date ? ` (${data.date} 기준)` : ''}`];
  if (Array.isArray(data.history) && data.history.length > 0) {
    // 월별 시계열이라 시작·끝 날짜만 밝히면 각 값의 시점을 복원할 수 있다.
    const first = data.history[0];
    const last = data.history[data.history.length - 1];
    const values = data.history.map((point) => point.value).join(', ');
    parts.push(`최근 ${data.history.length}개월(${first.date}~${last.date}): ${values}`);
  }
  return `[미국 기준금리]: ${parts.join(' / ')}`;
}

function summarizeTreasury(section) {
  const data = unwrapData(section);
  if (!data || data.yieldPercent == null) {
    return `[10년물 국채금리]: ${NO_DATA}`;
  }

  return `[10년물 국채금리]: ${data.yieldPercent}%${data.date ? ` (${data.date} 기준)` : ''}`;
}

function summarizeWatchlist(section) {
  const data = unwrapData(section);
  if (!data || !Array.isArray(data.themes) || data.themes.length === 0) {
    return `[관심 기업]: ${NO_DATA}`;
  }

  const themes = data.themes.map((theme) => {
    const companies = (theme.companies || []).map((company) => {
      const price =
        company.price == null
          ? NO_DATA
          : `${company.price}${company.currency === 'KRW' ? '원' : '달러'}`;
      const percent = formatSignedPercent(company.changesPercentage);
      return `${resolveDisplayName(company)} ${price}${percent ? ` ${percent}` : ''}`;
    });
    return `${theme.label} — ${companies.join(', ')}`;
  });
  return `[관심 기업]: ${themes.join(' / ')}`;
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
    summarizeUsMarket(sections.usMarket),
    summarizeVix(sections.vix),
    summarizeKrMarket(sections.krMarket),
    summarizeForeignFlow(sections.foreignFlow),
    summarizeFedFunds(sections.fedFunds),
    summarizeTreasury(sections.treasury),
    summarizeWatchlist(sections.watchlist),
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
