const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatDashboardLinkMessage,
} = require('../../../src/formatters/telegramLinkFormatter');

const url = 'https://ibyron17.github.io/market-dashboard/';

test('includes the dashboard url and an all-clear status when everything succeeded', () => {
  const sections = {
    usMarket: { status: 'ok' },
    krMarket: { status: 'ok' },
  };

  const message = formatDashboardLinkMessage(sections, url);

  assert.match(message, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(message, /모든 데이터가 정상적으로 수집/);
});

test('appends a cache-busting query parameter so the link is unique per run', () => {
  const sections = { usMarket: { status: 'ok' } };

  const message = formatDashboardLinkMessage(sections, url);

  assert.match(message, /\?v=\d+/);
});

test('includes a short disclaimer line noting this is not investment advice', () => {
  const sections = { usMarket: { status: 'ok' } };

  const message = formatDashboardLinkMessage(sections, url);

  assert.match(message, /투자 조언이 아닙니다/);
});

test('mentions the number of failed sections when some fail', () => {
  const sections = {
    usMarket: { status: 'ok' },
    krMarket: { status: 'error' },
    foreignFlow: { status: 'error' },
  };

  const message = formatDashboardLinkMessage(sections, url);

  assert.match(message, /전체 3개 항목 중 2개를 가져오지 못했습니다/);
});

// 파이프라인이 넘기는 실제 형태를 따른다. stockDetails는 배열, marketList·stockNews·
// secFilings는 객체라 status 필드가 없다.
function sampleSections(overrides = {}) {
  const ok = { status: 'ok', data: {} };
  return {
    usMarket: ok,
    stockDetails: [{ symbol: '005930', label: '삼성전자', integration: ok, trend: ok }],
    marketList: { kospi: ok, kosdaq: ok },
    stockNews: { '005930': ok },
    secFilings: { NVDA: ok },
    ...overrides,
  };
}

// 회귀 방지: 컨테이너(배열·맵)를 그대로 세면 status가 없어서 항상 실패로 잡히고,
// 전부 성공해도 "일부 항목을 가져오지 못했습니다"가 영구히 붙는다.
test('reports an all-clear when every envelope inside the containers succeeded', () => {
  const message = formatDashboardLinkMessage(sampleSections(), url);

  assert.match(message, /모든 데이터가 정상적으로 수집/);
  assert.ok(!message.includes('가져오지 못했습니다'));
});

// 회귀 방지: 컨테이너 안쪽 실패는 사용자에게 보고돼야 한다.
test('counts a failure nested inside a container', () => {
  const ok = { status: 'ok', data: {} };
  const message = formatDashboardLinkMessage(
    sampleSections({
      stockDetails: [
        { symbol: '005930', label: '삼성전자', integration: ok, trend: { status: 'error' } },
      ],
    }),
    url,
  );

  assert.match(message, /전체 7개 항목 중 1개를 가져오지 못했습니다/);
});
