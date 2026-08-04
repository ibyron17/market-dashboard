const test = require('node:test');
const assert = require('node:assert/strict');
const { applyDirectionSign } = require('../../../src/collectors/naverPriceSign');

test('applies positive sign for RISING', () => {
  assert.equal(applyDirectionSign('6.27', 'RISING'), 6.27);
  assert.equal(applyDirectionSign('0.15', 'RISING'), 0.15);
});

test('applies negative sign for FALLING', () => {
  assert.equal(applyDirectionSign('3.21', 'FALLING'), -3.21);
  assert.equal(applyDirectionSign('0.05', 'FALLING'), -0.05);
});

test('applies negative sign for LOWER_LIMIT', () => {
  assert.equal(applyDirectionSign('29.9', 'LOWER_LIMIT'), -29.9);
});

test('applies positive sign for UPPER_LIMIT', () => {
  assert.equal(applyDirectionSign('30.0', 'UPPER_LIMIT'), 30.0);
});

test('returns zero for EVEN direction', () => {
  assert.equal(applyDirectionSign('0.00', 'EVEN'), 0);
  assert.equal(applyDirectionSign('5.5', 'EVEN'), 0); // 비록 ratio가 0이 아니어도 EVEN이면 0
});

test('returns null for missing ratio', () => {
  assert.equal(applyDirectionSign(null, 'RISING'), null);
  assert.equal(applyDirectionSign('', 'RISING'), null);
  assert.equal(applyDirectionSign('   ', 'RISING'), null);
});

test('returns null for invalid ratio', () => {
  assert.equal(applyDirectionSign('invalid', 'RISING'), null);
  assert.equal(applyDirectionSign('NaN', 'RISING'), null);
});

test('handles ratio with commas', () => {
  assert.equal(applyDirectionSign('1,234.56', 'RISING'), 1234.56);
  assert.equal(applyDirectionSign('999,999', 'FALLING'), -999999);
});

test('handles unknown direction as positive', () => {
  assert.equal(applyDirectionSign('6.27', 'UNKNOWN'), 6.27);
  assert.equal(applyDirectionSign('6.27', null), 6.27);
});

test('takes absolute value of ratio', () => {
  // ratio가 음수여도 절댓값으로 처리
  assert.equal(applyDirectionSign('-6.27', 'RISING'), 6.27);
  assert.equal(applyDirectionSign('-3.21', 'FALLING'), -3.21);
});
