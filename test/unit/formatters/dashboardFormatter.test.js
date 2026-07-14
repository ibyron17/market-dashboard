const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDashboardHtml, escapeHtml } = require('../../../src/formatters/dashboardFormatter');

test('escapeHtml escapes html special characters', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

test('formatDashboardHtml includes no-cache meta tags so browsers always fetch fresh content', () => {
  const html = formatDashboardHtml({});

  assert.match(html, /http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/);
});

test('formatDashboardHtml renders ok sections with data', () => {
  const sections = {
    usMarket: {
      status: 'ok',
      data: {
        indices: [{ label: 'S&P 500 (SPY)', symbol: 'SPY', price: 500, changesPercentage: 1.1 }],
      },
    },
    krMarket: {
      status: 'ok',
      data: { kospi: { value: '2,650', change: '+10' }, kosdaq: { value: '860', change: '-2' } },
    },
    foreignFlow: { status: 'ok', data: { foreignNetBuy: '-1,234', institutionNetBuy: '5,678' } },
    treasury: { status: 'ok', data: { date: '2026-07-13', yieldPercent: '4.25' } },
    insight: { status: 'ok', data: { text: '오늘은 상승 마감했습니다.' } },
  };

  const html = formatDashboardHtml(sections);

  assert.match(html, /S&amp;P 500/);
  assert.match(html, /2,650/);
  assert.match(html, /-1,234/);
  assert.match(html, /4\.25%/);
  assert.match(html, /상승 마감/);
  assert.match(html, /<!doctype html>/);
});

test('formatDashboardHtml shows a warning for every failed section', () => {
  const sections = {
    usMarket: { status: 'error', error: 'timeout' },
    krMarket: { status: 'error', error: 'timeout' },
    foreignFlow: { status: 'error', error: 'timeout' },
    treasury: { status: 'error', error: 'timeout' },
    insight: { status: 'error', error: 'skipped' },
  };

  const html = formatDashboardHtml(sections);
  const warningCount = (html.match(/데이터를 가져오지 못했습니다/g) || []).length;

  assert.equal(warningCount, 4);
  assert.match(html, /인사이트를 생성하지 못했습니다/);
});

test('formatDashboardHtml escapes potentially unsafe scraped content', () => {
  const sections = {
    krMarket: {
      status: 'ok',
      data: {
        kospi: { value: '<img src=x onerror=alert(1)>', change: '+10' },
        kosdaq: { value: '860', change: '-2' },
      },
    },
  };

  const html = formatDashboardHtml(sections);

  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});
