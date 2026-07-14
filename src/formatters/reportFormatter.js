function escapeMarkdown(text) {
  return String(text).replace(/([_*`[])/g, '\\$1');
}

function formatIndexLine(index) {
  if (index.price == null) {
    return `- ${escapeMarkdown(index.label)}: 데이터 없음`;
  }
  const changeText = index.changesPercentage != null ? ` (${index.changesPercentage}%)` : '';
  return `- ${escapeMarkdown(index.label)}: ${index.price}${changeText}`;
}

function formatUsSection(section) {
  if (!section || section.status !== 'ok') {
    return '⚠️ 데이터를 가져오지 못했습니다.';
  }
  return section.data.indices.map(formatIndexLine).join('\n');
}

function formatKrSection(section) {
  if (!section || section.status !== 'ok') {
    return '⚠️ 데이터를 가져오지 못했습니다.';
  }
  const { kospi, kosdaq } = section.data;
  return [
    `- 코스피: ${escapeMarkdown(kospi.value)} (${escapeMarkdown(kospi.change)})`,
    `- 코스닥: ${escapeMarkdown(kosdaq.value)} (${escapeMarkdown(kosdaq.change)})`,
  ].join('\n');
}

function formatForeignFlowSection(section) {
  if (!section || section.status !== 'ok') {
    return '⚠️ 데이터를 가져오지 못했습니다.';
  }
  const { foreignNetBuy, institutionNetBuy } = section.data;
  return [
    `- 외국인 순매수: ${foreignNetBuy ? escapeMarkdown(foreignNetBuy) : '데이터 없음'}`,
    `- 기관 순매수: ${institutionNetBuy ? escapeMarkdown(institutionNetBuy) : '데이터 없음'}`,
  ].join('\n');
}

function formatInsightSection(section) {
  if (!section || section.status !== 'ok') {
    return '⚠️ 인사이트를 생성하지 못했습니다.';
  }
  return escapeMarkdown(section.data.text);
}

function formatReport(sections) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `*📊 ${today} 데일리 마켓 리포트*`,
    '',
    '*🇺🇸 미국 증시*',
    formatUsSection(sections.usMarket),
    '',
    '*🇰🇷 국내 증시*',
    formatKrSection(sections.krMarket),
    '',
    '*💱 외국인·기관 동향*',
    formatForeignFlowSection(sections.foreignFlow),
    '',
    '*🤖 Claude 인사이트*',
    formatInsightSection(sections.insight),
  ].join('\n');
}

module.exports = { formatReport, escapeMarkdown };
