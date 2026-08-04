const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFredObservations } = require('../../../src/collectors/fredMacroCollector');

test('parses FRED observations and filters out missing values', () => {
  const observations = [
    { date: '2026-08-01', value: '0.35' },
    { date: '2026-07-31', value: '0.45' },
    { date: '2026-07-30', value: '.' }, // 결측
    { date: '2026-07-29', value: '0.55' },
  ];

  const seriesInfo = {
    id: 'T10Y2Y',
    label: '장단기금리차',
    unit: '%',
  };

  const result = parseFredObservations(observations, seriesInfo);

  assert.equal(result.seriesId, 'T10Y2Y');
  assert.equal(result.label, '장단기금리차');
  assert.equal(result.unit, '%');
  assert.equal(result.latestValue, 0.35);
  assert.equal(result.latestDate, '2026-08-01');
});

test('rounds values to 2 decimal places', () => {
  const observations = [
    { date: '2026-08-01', value: '4.123456' },
  ];

  const seriesInfo = { id: 'UNRATE', label: '실업률', unit: '%' };

  const result = parseFredObservations(observations, seriesInfo);
  assert.equal(result.latestValue, 4.12);
});

test('returns null when all observations are missing', () => {
  const observations = [
    { date: '2026-08-01', value: '.' },
    { date: '2026-07-31', value: '.' },
  ];

  const seriesInfo = { id: 'T10Y2Y', label: '장단기금리차', unit: '%' };

  const result = parseFredObservations(observations, seriesInfo);
  assert.equal(result, null);
});

test('returns null for empty observations array', () => {
  const observations = [];
  const seriesInfo = { id: 'T10Y2Y', label: '장단기금리차', unit: '%' };

  const result = parseFredObservations(observations, seriesInfo);
  assert.equal(result, null);
});

test('returns null for non-numeric values', () => {
  const observations = [
    { date: '2026-08-01', value: 'invalid' },
  ];

  const seriesInfo = { id: 'T10Y2Y', label: '장단기금리차', unit: '%' };

  const result = parseFredObservations(observations, seriesInfo);
  assert.equal(result, null);
});

test('handles null or undefined observations', () => {
  const seriesInfo = { id: 'T10Y2Y', label: '장단기금리차', unit: '%' };

  assert.equal(parseFredObservations(null, seriesInfo), null);
  assert.equal(parseFredObservations(undefined, seriesInfo), null);
});

test('skips observations with empty value strings', () => {
  const observations = [
    { date: '2026-08-01', value: '' },
    { date: '2026-07-31', value: '0.45' },
  ];

  const seriesInfo = { id: 'T10Y2Y', label: '장단기금리차', unit: '%' };

  const result = parseFredObservations(observations, seriesInfo);
  assert.equal(result.latestValue, 0.45);
  assert.equal(result.latestDate, '2026-07-31');
});

test('handles negative values correctly', () => {
  const observations = [
    { date: '2026-08-01', value: '-0.5' },
  ];

  const seriesInfo = { id: 'T10Y2Y', label: '장단기금리차', unit: '%' };

  const result = parseFredObservations(observations, seriesInfo);
  assert.equal(result.latestValue, -0.5);
});

test('handles large numbers (dollar amounts, indices)', () => {
  const observations = [
    { date: '2026-08-01', value: '103.456' },
  ];

  const seriesInfo = { id: 'DTWEXBGS', label: '달러인덱스', unit: '지수' };

  const result = parseFredObservations(observations, seriesInfo);
  assert.equal(result.latestValue, 103.46);
});
