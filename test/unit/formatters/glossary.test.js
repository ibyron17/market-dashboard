const test = require('node:test');
const assert = require('node:assert/strict');
const { GLOSSARY } = require('../../../src/formatters/glossary');

test('provides a non-empty explanation for every dashboard section', () => {
  const requiredKeys = ['usMarket', 'krMarket', 'foreignFlow', 'treasury', 'watchlist', 'vix', 'fedFunds'];
  requiredKeys.forEach((key) => {
    assert.equal(typeof GLOSSARY[key], 'string');
    assert.ok(GLOSSARY[key].length > 0);
  });
});
