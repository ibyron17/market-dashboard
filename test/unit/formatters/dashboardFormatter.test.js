const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDashboardHtml } = require('../../../src/formatters/dashboardFormatter');

test('formatDashboardHtml includes no-cache meta tags so browsers always fetch fresh content', () => {
  const html = formatDashboardHtml({});

  assert.match(html, /http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/);
});

test('formatDashboardHtml includes only a bottom disclaimer banner', () => {
  const html = formatDashboardHtml({});
  const matches = html.match(/투자 조언이 아닙니다/g) || [];

  assert.equal(matches.length, 1);
});

test('formatDashboardHtml renders ok sections with data, including the watchlist card', () => {
  const sections = {
    usMarket: {
      status: 'ok',
      data: {
        indices: [{ label: 'S&P 500 (SPY)', symbol: 'SPY', price: 500, changesPercentage: 1.1 }],
      },
    },
    vix: { status: 'ok', data: { price: 18.4, changesPercentage: -2.1 } },
    krMarket: {
      status: 'ok',
      data: { kospi: { value: '2,650', change: '+10' }, kosdaq: { value: '860', change: '-2' } },
    },
    foreignFlow: { status: 'ok', data: { foreignNetBuy: '-1,234', institutionNetBuy: '5,678' } },
    fedFunds: { status: 'ok', data: { rate: 3.63, date: '2026-06-01', history: [] } },
    treasury: { status: 'ok', data: { date: '2026-07-13', yieldPercent: '4.25' } },
    watchlist: {
      status: 'ok',
      data: {
        themes: [
          {
            key: 'semiconductor',
            label: '반도체',
            companies: [{ label: '엔비디아', symbol: 'NVDA', price: 130, changesPercentage: 2.1 }],
          },
        ],
      },
    },
    insight: { status: 'ok', data: { text: '오늘은 상승 마감했습니다.' } },
  };

  const html = formatDashboardHtml(sections);

  assert.match(html, /S&amp;P 500/);
  assert.match(html, /18\.4/);
  assert.match(html, /2,650/);
  assert.match(html, /-1,234/);
  assert.match(html, /3\.63%/);
  assert.match(html, /4\.25%/);
  assert.match(html, /엔비디아/);
  assert.match(html, /상승 마감/);
  assert.match(html, /오늘의 요약/);
  assert.match(html, /<!doctype html>/);
});

test('formatDashboardHtml shows a warning for every failed section', () => {
  const sections = {
    usMarket: { status: 'error', error: 'timeout' },
    vix: { status: 'error', error: 'timeout' },
    krMarket: { status: 'error', error: 'timeout' },
    foreignFlow: { status: 'error', error: 'timeout' },
    fedFunds: { status: 'error', error: 'timeout' },
    treasury: { status: 'error', error: 'timeout' },
    watchlist: { status: 'error', error: 'timeout' },
    insight: { status: 'error', error: 'skipped' },
  };

  const html = formatDashboardHtml(sections);
  const warningCount = (html.match(/데이터를 가져오지 못했습니다/g) || []).length;

  assert.equal(warningCount, 7);
  assert.match(html, /인사이트를 생성하지 못했습니다/);
});

test('formatDashboardHtml uses a light theme and loads Chart.js for the trend chart', () => {
  const html = formatDashboardHtml({});

  assert.match(html, /color-scheme: light/);
  assert.match(html, /cdn\.jsdelivr\.net\/npm\/chart\.js/);
});

test('formatDashboardHtml renders index rows as a table so columns line up across rows', () => {
  const sections = {
    usMarket: {
      status: 'ok',
      data: {
        indices: [
          { label: 'S&P 500', symbol: '^GSPC', price: 500, changesPercentage: 1.1 },
          { label: '나스닥 종합지수', symbol: '^IXIC', price: 400, changesPercentage: -0.5 },
        ],
      },
    },
  };

  const html = formatDashboardHtml(sections);

  assert.match(html, /<table class="data-table">/);
  assert.match(html, /<td class="label">S&amp;P 500<\/td>/);
});

test('formatDashboardHtml places the AI insight card above the rest of the dashboard', () => {
  const sections = {
    insight: { status: 'ok', data: { text: '오늘은 상승 마감했습니다.' } },
    usMarket: { status: 'ok', data: { indices: [] } },
  };

  const html = formatDashboardHtml(sections);

  assert.ok(html.indexOf('AI 인사이트') < html.indexOf('오늘의 요약'));
  assert.ok(html.indexOf('AI 인사이트') < html.indexOf('미국 증시'));
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
