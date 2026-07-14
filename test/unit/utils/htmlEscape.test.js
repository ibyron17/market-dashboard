const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, changeClass, changeLabel } = require('../../../src/utils/htmlEscape');

test('escapeHtml escapes html special characters', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
  );
});

test('changeClass returns up/down/empty based on numeric sign', () => {
  assert.equal(changeClass('1.2'), 'up');
  assert.equal(changeClass('-0.5'), 'down');
  assert.equal(changeClass('0'), '');
  assert.equal(changeClass(null), '');
  assert.equal(changeClass('1,234'), 'up');
});

test('changeLabel returns a beginner-friendly label', () => {
  assert.equal(changeLabel('1.2'), '▲ 상승');
  assert.equal(changeLabel('-0.5'), '▼ 하락');
  assert.equal(changeLabel('0'), '보합(변동 없음)');
  assert.equal(changeLabel(null), '데이터 없음');
});
