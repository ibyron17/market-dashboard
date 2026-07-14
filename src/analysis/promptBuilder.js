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
    describeSection('국내 증시', sections.krMarket),
    describeSection('외국인·기관 동향', sections.foreignFlow),
    describeSection('10년물 국채금리', sections.treasury),
  ];

  return [
    '아래는 오늘 수집된 시장 데이터다. 이 데이터를 바탕으로 한국 개인 투자자를 위한 3~4문장 분량의',
    '간결한 인사이트를 한국어로 작성해줘. 숫자를 임의로 지어내지 말고 주어진 데이터만 근거로 해석해줘.',
    '데이터가 없는 항목은 언급하지 않아도 된다.',
    '',
    ...lines,
  ].join('\n');
}

module.exports = { buildInsightPrompt, hasUsableData };
