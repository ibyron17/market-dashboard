const test = require('node:test');
const assert = require('node:assert/strict');
const { parseIndustryTrends, toNumberOrNull } = require('../../../src/collectors/industryTrendsCollector');

test('parses industry trends and sorts by change rate', () => {
  const body = {
    groups: [
      { name: '반도체와반도체장비', totalCount: 23, changeRate: '28.03', riseCount: 19, fallCount: 3, steadyCount: 1 },
      { name: '소재', totalCount: 15, changeRate: '-3.45', riseCount: 2, fallCount: 12, steadyCount: 1 },
      { name: '에너지', totalCount: 10, changeRate: '5.67', riseCount: 8, fallCount: 2, steadyCount: 0 },
    ],
  };

  const result = parseIndustryTrends(body);

  assert(Array.isArray(result.industries));
  assert(Array.isArray(result.topRising));
  assert(Array.isArray(result.topFalling));

  // topRising 확인 (상위 5, 여기서는 2개)
  assert.equal(result.topRising[0].name, '반도체와반도체장비');
  assert.equal(result.topRising[0].changeRate, 28.03);
  assert.equal(result.topRising[1].name, '에너지');
  assert.equal(result.topRising[1].changeRate, 5.67);

  // topFalling 확인 (하위 3)
  assert.equal(result.topFalling[0].name, '소재');
  assert.equal(result.topFalling[0].changeRate, -3.45);
});

test('filters out industries without changeRate', () => {
  const body = {
    groups: [
      { name: '반도체', totalCount: 23, changeRate: '28.03', riseCount: 19, fallCount: 3, steadyCount: 1 },
      { name: '부실업종', totalCount: 5, changeRate: null, riseCount: 0, fallCount: 0, steadyCount: 5 },
      { name: '에너지', totalCount: 10, changeRate: '5.67', riseCount: 8, fallCount: 2, steadyCount: 0 },
    ],
  };

  const result = parseIndustryTrends(body);

  // 부실업종은 필터링됨
  assert.equal(result.industries.length, 2);
  assert(!result.industries.some((ind) => ind.name === '부실업종'));
});

test('handles negative change rates correctly', () => {
  const body = {
    groups: [
      { name: '업종1', totalCount: 10, changeRate: '-10.5', riseCount: 2, fallCount: 8, steadyCount: 0 },
      { name: '업종2', totalCount: 10, changeRate: '-5.3', riseCount: 3, fallCount: 7, steadyCount: 0 },
    ],
  };

  const result = parseIndustryTrends(body);

  assert.equal(result.topFalling[0].changeRate, -10.5);
  assert.equal(result.topFalling[1].changeRate, -5.3);
});

test('returns empty topRising/topFalling for insufficient data', () => {
  const body = {
    groups: [
      { name: '업종1', totalCount: 10, changeRate: '5.0', riseCount: 8, fallCount: 2, steadyCount: 0 },
    ],
  };

  const result = parseIndustryTrends(body);

  assert.equal(result.topRising.length, 1);
  assert.equal(result.topFalling.length, 1);
});

test('throws error on invalid response structure', () => {
  const body = null;
  assert.throws(
    () => parseIndustryTrends(body),
    /Invalid industry trends response/,
  );

  const bodyNoGroups = { groups: null };
  assert.throws(
    () => parseIndustryTrends(bodyNoGroups),
    /Invalid industry trends response/,
  );
});

test('toNumberOrNull handles various formats', () => {
  assert.equal(toNumberOrNull('28.03'), 28.03);
  assert.equal(toNumberOrNull('-3.45'), -3.45);
  assert.equal(toNumberOrNull('10,500'), 10500);
  assert.equal(toNumberOrNull(''), null);
  assert.equal(toNumberOrNull(null), null);
  assert.equal(toNumberOrNull('invalid'), null);
});

test('handles missing count fields gracefully', () => {
  const body = {
    groups: [
      { name: '반도체', changeRate: '28.03' },
      { name: '에너지', changeRate: '5.67', riseCount: 8 },
    ],
  };

  const result = parseIndustryTrends(body);

  assert.equal(result.industries[0].totalCount, 0);
  assert.equal(result.industries[1].fallCount, 0);
});

test('maintains original industries array unmodified', () => {
  const body = {
    groups: [
      { name: '에너지', changeRate: '5.0' },
      { name: '반도체', changeRate: '10.0' },
      { name: '소재', changeRate: '-5.0' },
    ],
  };

  const result = parseIndustryTrends(body);

  // industries는 원본 순서 유지
  assert.equal(result.industries[0].name, '에너지');
  assert.equal(result.industries[1].name, '반도체');
  assert.equal(result.industries[2].name, '소재');

  // topRising은 정렬됨
  assert.equal(result.topRising[0].name, '반도체');
  assert.equal(result.topRising[1].name, '에너지');
});
