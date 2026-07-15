function hasUsableData(sections) {
  return Object.values(sections).some((section) => section && section.status === 'ok');
}

function describeSection(title, section) {
  if (!section || section.status !== 'ok') {
    return `${title}: 데이터 없음`;
  }
  return `${title}: ${JSON.stringify(section.data)}`;
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
