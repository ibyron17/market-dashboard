const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveDashboardUrl, DEFAULT_DASHBOARD_URL } = require('../../../src/utils/dashboardUrl');

test('returns the default URL when GITHUB_REPOSITORY is not set', () => {
  assert.equal(resolveDashboardUrl({}), DEFAULT_DASHBOARD_URL);
});

test('derives the Pages URL from GITHUB_REPOSITORY', () => {
  const url = resolveDashboardUrl({ GITHUB_REPOSITORY: 'someone/some-repo' });
  assert.equal(url, 'https://someone.github.io/some-repo/');
});
