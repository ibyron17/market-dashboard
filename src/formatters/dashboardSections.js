const { escapeHtml, changeClass, changeLabel } = require('../utils/htmlEscape');
const { GLOSSARY } = require('./glossary');

function renderCard(title, hint, bodyHtml) {
  return `
      <section class="card">
        <h2>${escapeHtml(title)}</h2>
        <p class="hint">${escapeHtml(hint)}</p>
        ${bodyHtml}
      </section>`;
}

function renderStatusCard(title, hint, section, renderBody) {
  if (!section || section.status !== 'ok') {
    return renderCard(title, hint, '<p class="warning">⚠️ 데이터를 가져오지 못했습니다.</p>');
  }
  return renderCard(title, hint, renderBody(section.data));
}

function renderDisclaimer() {
  return `
      <div class="disclaimer">
        ⚠️ 이 대시보드는 정보 제공을 목적으로 하며 투자 조언이 아닙니다. 모든 투자 판단과 책임은 본인에게 있습니다.
      </div>`;
}

function countUpDown(values) {
  return values.reduce(
    (acc, value) => {
      const cls = changeClass(value);
      if (cls === 'up') return { up: acc.up + 1, down: acc.down };
      if (cls === 'down') return { up: acc.up, down: acc.down + 1 };
      return acc;
    },
    { up: 0, down: 0 },
  );
}

function renderSummary(sections) {
  const values = [];
  if (sections.usMarket && sections.usMarket.status === 'ok') {
    values.push(...sections.usMarket.data.indices.map((index) => index.changesPercentage));
  }
  if (sections.krMarket && sections.krMarket.status === 'ok') {
    values.push(sections.krMarket.data.kospi.change, sections.krMarket.data.kosdaq.change);
  }

  const { up, down } = countUpDown(values);
  let mood = '오늘 수집된 지수 데이터가 부족해 전반적인 분위기를 요약하기 어려워요.';
  if (up > down) {
    mood = `오늘은 상승한 지수(${up}개)가 하락한 지수(${down}개)보다 많았어요. 전반적으로 좋은 흐름이었어요.`;
  } else if (down > up) {
    mood = `오늘은 하락한 지수(${down}개)가 상승한 지수(${up}개)보다 많았어요. 전반적으로 조심스러운 흐름이었어요.`;
  } else if (up + down > 0) {
    mood = '오늘은 상승과 하락이 비슷하게 나타난, 방향성이 뚜렷하지 않은 날이었어요.';
  }

  return `
      <section class="card summary">
        <h2>📌 오늘의 요약</h2>
        <p>${escapeHtml(mood)}</p>
        <p class="hint">처음이신가요? 이 순서로 읽어보세요: ① 오늘의 요약 → ② 미국·국내 증시 → ③ 외국인·기관 동향 → ④ 관심 기업 → ⑤ AI 인사이트</p>
      </section>`;
}

function renderUsMarket(section) {
  return renderStatusCard(
    '🇺🇸 미국 증시',
    GLOSSARY.usMarket,
    section,
    (data) => `
        <ul class="index-list">
          ${data.indices
            .map(
              (index) => `
          <li>
            <span class="label">${escapeHtml(index.label)}</span>
            <span class="value">${index.price != null ? escapeHtml(index.price) : '데이터 없음'}</span>
            <span class="change ${changeClass(index.changesPercentage)}">
              ${escapeHtml(changeLabel(index.changesPercentage))}
              ${index.changesPercentage != null ? `(${escapeHtml(index.changesPercentage)}%)` : ''}
            </span>
          </li>`,
            )
            .join('')}
        </ul>`,
  );
}

function renderKrMarket(section) {
  return renderStatusCard(
    '🇰🇷 국내 증시',
    GLOSSARY.krMarket,
    section,
    (data) => `
        <ul class="index-list">
          <li>
            <span class="label">코스피</span>
            <span class="value">${escapeHtml(data.kospi.value)}</span>
            <span class="change ${changeClass(data.kospi.change)}">${escapeHtml(changeLabel(data.kospi.change))} (${escapeHtml(data.kospi.change)})</span>
          </li>
          <li>
            <span class="label">코스닥</span>
            <span class="value">${escapeHtml(data.kosdaq.value)}</span>
            <span class="change ${changeClass(data.kosdaq.change)}">${escapeHtml(changeLabel(data.kosdaq.change))} (${escapeHtml(data.kosdaq.change)})</span>
          </li>
        </ul>`,
  );
}

function renderForeignFlow(section) {
  return renderStatusCard(
    '💱 외국인·기관 동향',
    GLOSSARY.foreignFlow,
    section,
    (data) => `
        <ul class="index-list">
          <li>
            <span class="label">외국인 순매수</span>
            <span class="value ${changeClass(data.foreignNetBuy)}">${
              data.foreignNetBuy ? escapeHtml(data.foreignNetBuy) : '데이터 없음'
            }</span>
          </li>
          <li>
            <span class="label">기관 순매수</span>
            <span class="value ${changeClass(data.institutionNetBuy)}">${
              data.institutionNetBuy ? escapeHtml(data.institutionNetBuy) : '데이터 없음'
            }</span>
          </li>
        </ul>`,
  );
}

function renderTreasury(section) {
  return renderStatusCard(
    '💵 10년물 국채금리',
    GLOSSARY.treasury,
    section,
    (data) => `
        <p class="treasury-value">${data.yieldPercent != null ? `${escapeHtml(data.yieldPercent)}%` : '데이터 없음'}</p>
        <p class="treasury-date">${data.date ? escapeHtml(data.date) : ''}</p>`,
  );
}

function renderWatchlist(section) {
  return renderStatusCard(
    '🏢 오늘의 관심 기업',
    GLOSSARY.watchlist,
    section,
    (data) => `
        <ul class="index-list">
          ${data.companies
            .map(
              (company) => `
          <li>
            <span class="label">${escapeHtml(company.label)} (${escapeHtml(company.symbol)})</span>
            <span class="value">${company.price != null ? escapeHtml(company.price) : '데이터 없음'}</span>
            <span class="change ${changeClass(company.changesPercentage)}">
              ${escapeHtml(changeLabel(company.changesPercentage))}
              ${company.changesPercentage != null ? `(${escapeHtml(company.changesPercentage)}%)` : ''}
            </span>
          </li>`,
            )
            .join('')}
        </ul>`,
  );
}

function renderInsight(section) {
  if (!section || section.status !== 'ok') {
    return `
      <section class="card insight">
        <h2>🤖 AI 인사이트</h2>
        <p class="warning">⚠️ 인사이트를 생성하지 못했습니다.</p>
      </section>`;
  }
  return `
      <section class="card insight">
        <h2>🤖 AI 인사이트</h2>
        <p>${escapeHtml(section.data.text)}</p>
        <p class="hint">※ 위 내용은 데이터 기반 참고 정보이며 투자 조언이 아닙니다.</p>
      </section>`;
}

module.exports = {
  renderDisclaimer,
  renderSummary,
  renderUsMarket,
  renderKrMarket,
  renderForeignFlow,
  renderTreasury,
  renderWatchlist,
  renderInsight,
};
