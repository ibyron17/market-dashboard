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

test('mentions the number of failed sections when some fail', () => {
  const sections = {
    usMarket: { status: 'ok' },
    krMarket: { status: 'error' },
    foreignFlow: { status: 'error' },
  };

  const message = formatDashboardLinkMessage(sections, url);

  assert.match(message, /2건/);
});
