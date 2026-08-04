const { escapeHtml, changeClass, changeLabel, formatPercent } = require('../utils/htmlEscape');
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

function renderTable(rows, headers = []) {
  const headHtml =
    headers.length > 0
      ? `
          <thead>
            <tr>
              ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
            </tr>
          </thead>`
      : '';

  // 신규 표는 열이 많아(최대 6열) 휴대폰 화면을 넘는다. 페이지 전체가 옆으로
  // 밀리지 않도록 표만 가로로 스크롤되게 감싼다.
  return `
        <div class="table-scroll">
        <table class="data-table">${headHtml}
          <tbody>
            ${rows
              .map(
                (cells) => `
            <tr>
              ${cells.map((cell) => `<td class="${cell.className || ''}">${cell.html}</td>`).join('')}
            </tr>`,
              )
              .join('')}
          </tbody>
        </table>
        </div>`;
}

function renderIndustryTrends(section) {
  return renderStatusCard(
    '🏭 업종별 등락',
    GLOSSARY.industryTrends,
    section,
    (data) => {
      if (!data.topRising || !data.topFalling) {
        return '<p class="warning">데이터 없음</p>';
      }

      const allIndustries = [...data.topRising, ...data.topFalling];
      const rows = allIndustries.map((industry) => [
        { className: 'label', html: escapeHtml(industry.name) },
        {
          className: `change ${changeClass(industry.changeRate)}`,
          html: `${escapeHtml(changeLabel(industry.changeRate))}${formatPercent(industry.changeRate) ? ` (${escapeHtml(formatPercent(industry.changeRate))})` : ''}`,
        },
      ]);

      return renderTable(rows, ['업종', '등락률']);
    },
  );
}

const NO_DATA = '데이터 없음';

/** 숫자를 천단위 콤마 문자열로. null/NaN이면 '데이터 없음'. */
function formatNumber(value, { withSign = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return NO_DATA;
  const numeric = Number(value);
  const sign = withSign && numeric > 0 ? '+' : '';
  return `${sign}${numeric.toLocaleString('ko-KR')}`;
}

/** 통합정보/추세 봉투에서 data를 꺼낸다. 실패했으면 null. */
function unwrap(envelope) {
  return envelope && envelope.status === 'ok' ? envelope.data : null;
}

/** 200일선 대비 위치를 화살표와 괴리율로 표기한다. */
function formatTrendPosition(trendData) {
  const trend = trendData && trendData.trend;
  if (!trend || trend.movingAverage == null) return NO_DATA;
  const arrow = trend.isAbove ? '▲' : '▼';
  const position = trend.isAbove ? '위' : '아래';
  return `${arrow} 200일선 ${position} (${formatPercent(trend.deviationPercent)})`;
}

/**
 * 관심기업 심화 지표 표. 한 종목의 수집이 실패해도 행을 지우지 않고
 * 해당 칸만 '데이터 없음'으로 남긴다(항목별 실패 격리).
 */
function renderStockDetailsTable(stockDetails) {
  if (!Array.isArray(stockDetails) || stockDetails.length === 0) {
    return `<p class="warning">${NO_DATA}</p>`;
  }

  const rows = stockDetails.map((item) => {
    const integration = unwrap(item.integration);
    const trend = unwrap(item.trend);
    const range =
      integration && integration.low52Weeks != null && integration.high52Weeks != null
        ? `${formatNumber(integration.low52Weeks)} ~ ${formatNumber(integration.high52Weeks)}`
        : NO_DATA;

    return [
      { className: 'label', html: escapeHtml(item.label) },
      { className: 'value', html: escapeHtml(integration ? formatNumber(integration.per) : NO_DATA) },
      { className: 'value', html: escapeHtml(integration ? formatNumber(integration.estimatedPer) : NO_DATA) },
      { className: 'value', html: escapeHtml(range) },
      {
        className: 'value',
        html: escapeHtml(
          integration && integration.investorFlow
            ? formatNumber(integration.investorFlow.foreign, { withSign: true })
            : NO_DATA,
        ),
      },
      { className: 'value', html: escapeHtml(formatTrendPosition(trend)) },
    ];
  });

  return renderTable(rows, [
    '기업',
    'PER',
    '추정PER',
    '52주 최저~최고',
    '외국인 순매수(주)',
    '200일선 대비',
  ]);
}

/** 컨센서스 척도 해석. recommMean은 높을수록 긍정(1~5, 실데이터 검증). */
function describeOpinion(opinionMean) {
  if (opinionMean == null) return NO_DATA;
  const tone = opinionMean >= 3.5 ? '긍정적 의견 우세' : opinionMean >= 2.5 ? '중립' : '신중한 의견 우세';
  return `${tone} (${opinionMean}/5)`;
}

/**
 * 증권사 컨센서스 표. 목표주가는 전망이지 보장이 아니므로 기준일을 함께 보여준다.
 */
function renderConsensusTable(stockDetails) {
  if (!Array.isArray(stockDetails) || stockDetails.length === 0) {
    return `<p class="warning">${NO_DATA}</p>`;
  }

  const rows = stockDetails.map((item) => {
    const integration = unwrap(item.integration);
    const consensus = integration && integration.consensus;
    const latestReport = integration && integration.researchReports && integration.researchReports[0];

    return [
      { className: 'label', html: escapeHtml(item.label) },
      { className: 'value', html: escapeHtml(consensus ? describeOpinion(consensus.opinionMean) : NO_DATA) },
      { className: 'value', html: escapeHtml(consensus ? formatNumber(consensus.priceTargetMean) : NO_DATA) },
      { className: 'value', html: escapeHtml(consensus && consensus.date ? consensus.date : NO_DATA) },
      {
        className: 'value',
        html: latestReport
          ? `${escapeHtml(latestReport.brokerName)} · ${escapeHtml(latestReport.title)}`
          : NO_DATA,
      },
    ];
  });

  return renderTable(rows, ['기업', '투자의견', '평균 목표주가(원)', '기준일', '최근 리포트']);
}

function renderMarketCapRanking(marketList) {
  if (!marketList || (!marketList.kospi && !marketList.kosdaq)) {
    return renderCard('💹 시가총액 상위 종목', GLOSSARY.marketCapRanking, '<p class="warning">⚠️ 데이터를 가져오지 못했습니다.</p>');
  }

  let bodyHtml = '';

  if (marketList.kospi && marketList.kospi.status === 'ok' && marketList.kospi.data.stocks) {
    const kospiRows = marketList.kospi.data.stocks.slice(0, 10).map((stock, idx) => [
      { className: 'label', html: `${idx + 1}. ${escapeHtml(stock.name)}` },
      { className: 'value', html: escapeHtml(formatNumber(stock.price)) },
      {
        className: `change ${changeClass(stock.changesPercentage)}`,
        html: `${escapeHtml(changeLabel(stock.changesPercentage))}${formatPercent(stock.changesPercentage) ? ` (${escapeHtml(formatPercent(stock.changesPercentage))})` : ''}`,
      },
    ]);

    bodyHtml += `<h3 style="font-size:0.95rem; margin:1rem 0 0.5rem">코스피</h3>`;
    bodyHtml += renderTable(kospiRows, ['순위 / 기업', '현재가', '등락률']);
  }

  if (marketList.kosdaq && marketList.kosdaq.status === 'ok' && marketList.kosdaq.data.stocks) {
    const kosdaqRows = marketList.kosdaq.data.stocks.slice(0, 10).map((stock, idx) => [
      { className: 'label', html: `${idx + 1}. ${escapeHtml(stock.name)}` },
      { className: 'value', html: escapeHtml(formatNumber(stock.price)) },
      {
        className: `change ${changeClass(stock.changesPercentage)}`,
        html: `${escapeHtml(changeLabel(stock.changesPercentage))}${formatPercent(stock.changesPercentage) ? ` (${escapeHtml(formatPercent(stock.changesPercentage))})` : ''}`,
      },
    ]);

    bodyHtml += `<h3 style="font-size:0.95rem; margin:1rem 0 0.5rem">코스닥</h3>`;
    bodyHtml += renderTable(kosdaqRows, ['순위 / 기업', '현재가', '등락률']);
  }

  if (!bodyHtml) {
    bodyHtml = '<p class="warning">⚠️ 데이터를 가져오지 못했습니다.</p>';
  }

  return renderCard('💹 시가총액 상위 종목', GLOSSARY.marketCapRanking, bodyHtml);
}

function renderMacroIndicators(section) {
  if (!section || section.status !== 'ok') {
    return renderCard('💰 FRED 거시지표', GLOSSARY.yieldCurve, '<p class="warning">⚠️ 데이터를 가져오지 못했습니다.</p>');
  }

  // 키 미설정은 실패가 아니라 정상 상태(status:'ok', configured:false)로 온다.
  // 실패 문구 대신 켜는 방법을 알려준다.
  if (section.data && section.data.configured === false) {
    return renderCard(
      '💰 FRED 거시지표',
      GLOSSARY.yieldCurve,
      '<p class="hint">아직 설정되지 않았어요. FRED(미국 세인트루이스 연준)에서 무료 API 키를 발급받아 <code>FRED_API_KEY</code>로 등록하면 장단기 금리차·실업률 같은 지표가 여기에 표시됩니다.</p>',
    );
  }

  const { indicators } = section.data;
  if (!Array.isArray(indicators) || indicators.length === 0) {
    return renderCard('💰 FRED 거시지표', GLOSSARY.yieldCurve, '<p class="warning">데이터 없음</p>');
  }

  const rows = indicators.map((indicator) => [
    { className: 'label', html: escapeHtml(indicator.label) },
    { className: 'value', html: `${escapeHtml(String(indicator.latestValue))} ${escapeHtml(indicator.unit || '')}` },
    { className: 'value', html: escapeHtml(indicator.latestDate || '데이터 없음') },
    {
      className: `change ${indicator.changeDirection === 'up' ? 'up' : indicator.changeDirection === 'down' ? 'down' : ''}`,
      html: indicator.changeDirection === 'up' ? '▲' : indicator.changeDirection === 'down' ? '▼' : '보합',
    },
  ]);

  return renderCard('💰 FRED 거시지표', GLOSSARY.yieldCurve, renderTable(rows, ['지표', '최신값', '기준일', '방향']));
}

function renderNewsAndFilings(stockNews, secFilings) {
  let newsHtml = '';
  let secHtml = '';

  if (stockNews && typeof stockNews === 'object') {
    const articles = [];
    Object.values(stockNews).forEach((newsItem) => {
      if (newsItem && newsItem.status === 'ok' && newsItem.data && newsItem.data.articles) {
        articles.push(...newsItem.data.articles.slice(0, 3));
      }
    });

    if (articles.length > 0) {
      const newsRows = articles.slice(0, 5).map((article) => [
        { className: 'label', html: escapeHtml(article.officeName || '기타') },
        {
          className: 'value',
          // 엔티티 디코딩은 수집기(경계)에서 이미 끝났다. 여기서 또 디코딩하면
          // "AT&amp;T" 같은 제목이 한 단계 더 풀려 원문과 달라진다.
          html: `<a href="${escapeHtml(article.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a>`,
        },
        { className: 'value', html: escapeHtml(`${article.publishedAt?.date || ''} ${article.publishedAt?.time || ''}`) },
      ]);

      newsHtml = `<div style="margin-bottom:1rem"><h3 style="font-size:0.95rem;margin:0 0 0.5rem">국내 뉴스</h3>${renderTable(newsRows, ['언론사', '제목', '시각'])}</div>`;
    }
  }

  if (secFilings && typeof secFilings === 'object') {
    const filings = [];
    Object.values(secFilings).forEach((filingItem) => {
      if (filingItem && filingItem.status === 'ok' && filingItem.data && filingItem.data.filings) {
        filings.push(...filingItem.data.filings.slice(0, 3));
      }
    });

    if (filings.length > 0) {
      const formLabelMap = {
        '10-K': '연간보고서',
        '10-Q': '분기보고서',
        '8-K': '수시공시',
        4: '내부자거래',
      };

      const secRows = filings.slice(0, 5).map((filing) => [
        { className: 'label', html: escapeHtml(filing.symbol || '') },
        { className: 'value', html: escapeHtml(`${filing.form}(${formLabelMap[filing.form] || filing.form})`) },
        { className: 'value', html: escapeHtml(filing.filingDate || '') },
      ]);

      secHtml = `<div><h3 style="font-size:0.95rem;margin:0 0 0.5rem">미국 공시</h3>${renderTable(secRows, ['티커', '서식', '날짜'])}</div>`;
    }
  }

  if (!newsHtml && !secHtml) {
    return renderCard('📰 뉴스 & 공시', GLOSSARY.secFilings, '<p class="warning">데이터 없음</p>');
  }

  return renderCard('📰 뉴스 & 공시', GLOSSARY.secFilings, newsHtml + secHtml);
}

module.exports = {
  renderIndustryTrends,
  renderStockDetailsTable,
  renderConsensusTable,
  renderMarketCapRanking,
  renderMacroIndicators,
  renderNewsAndFilings,
};
