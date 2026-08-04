const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCik, parseSecFilings } = require('../../../src/collectors/secFilingsCollector');

test('resolveCik finds ticker in map and returns padded CIK', () => {
  const tickerMap = {
    0: { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
    1: { cik_str: 1018724, ticker: 'AMZN', title: 'Amazon.com Inc.' },
  };

  const cik = resolveCik(tickerMap, 'AAPL');
  assert.equal(cik, '0000320193');

  const cikAmzn = resolveCik(tickerMap, 'AMZN');
  assert.equal(cikAmzn, '0001018724');
});

test('resolveCik is case-insensitive', () => {
  const tickerMap = {
    0: { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
  };

  assert.equal(resolveCik(tickerMap, 'aapl'), '0000320193');
  assert.equal(resolveCik(tickerMap, 'AaPl'), '0000320193');
});

test('resolveCik returns null for missing ticker', () => {
  const tickerMap = {
    0: { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
  };

  assert.equal(resolveCik(tickerMap, 'NVDA'), null);
});

test('resolveCik returns null for null or empty input', () => {
  const tickerMap = { 0: { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' } };

  assert.equal(resolveCik(tickerMap, null), null);
  assert.equal(resolveCik(null, 'AAPL'), null);
  assert.equal(resolveCik({}, 'AAPL'), null);
});

test('parseSecFilings transforms column-parallel arrays to rows', () => {
  const filings = {
    filingDate: ['2026-08-01', '2026-07-15', '2026-07-01'],
    form: ['10-Q', '8-K', '10-K'],
    primaryDocDescription: ['Q2 2026 10-Q', 'Material Event', 'Annual Report'],
    accessionNumber: ['0001193125-26-123456', '0001193125-26-123455', '0001193125-26-123454'],
  };

  const records = parseSecFilings(filings, 5);

  assert.equal(records.length, 3);
  assert.equal(records[0].form, '10-Q');
  assert.equal(records[0].filingDate, '2026-08-01');
  assert.equal(records[0].description, 'Q2 2026 10-Q');
  assert.equal(records[1].form, '8-K');
  assert.equal(records[2].form, '10-K');
});

test('parseSecFilings filters by FILING_FORMS only', () => {
  const filings = {
    filingDate: ['2026-08-01', '2026-07-15', '2026-07-01', '2026-06-15'],
    form: ['10-Q', '10-Q/A', '8-K', '4'],
    primaryDocDescription: ['Doc1', 'Doc2', 'Doc3', 'Doc4'],
    accessionNumber: ['Acc1', 'Acc2', 'Acc3', 'Acc4'],
  };

  const records = parseSecFilings(filings, 10);

  // 10-Q, 8-K, 4만 포함. 10-Q/A는 제외.
  assert.equal(records.length, 3);
  assert.equal(records[0].form, '10-Q');
  assert.equal(records[1].form, '8-K');
  assert.equal(records[2].form, '4');
});

test('parseSecFilings limits to specified count', () => {
  const filings = {
    filingDate: ['2026-08-01', '2026-07-15', '2026-07-01', '2026-06-15', '2026-05-15'],
    form: ['10-Q', '10-Q', '10-Q', '10-Q', '10-Q'],
    primaryDocDescription: ['Doc1', 'Doc2', 'Doc3', 'Doc4', 'Doc5'],
    accessionNumber: ['Acc1', 'Acc2', 'Acc3', 'Acc4', 'Acc5'],
  };

  const records = parseSecFilings(filings, 2);
  assert.equal(records.length, 2);
});

test('parseSecFilings handles missing optional fields', () => {
  const filings = {
    filingDate: ['2026-08-01', '2026-07-15'],
    form: ['10-Q', '8-K'],
    // primaryDocDescription 없음
    // accessionNumber 없음
  };

  const records = parseSecFilings(filings, 5);

  assert.equal(records.length, 2);
  assert.equal(records[0].form, '10-Q');
  assert.equal(records[0].description, null);
  assert.equal(records[0].accessionNumber, null);
});

test('parseSecFilings returns empty for no matching forms', () => {
  const filings = {
    filingDate: ['2026-08-01', '2026-07-15'],
    form: ['UNKNOWN', 'IRRELEVANT'],
    primaryDocDescription: ['Doc1', 'Doc2'],
    accessionNumber: ['Acc1', 'Acc2'],
  };

  const records = parseSecFilings(filings, 5);
  assert.equal(records.length, 0);
});

test('parseSecFilings returns empty for null or missing filingDate', () => {
  const filings1 = null;
  assert.deepEqual(parseSecFilings(filings1, 5), []);

  const filings2 = { form: ['10-Q'] };
  assert.deepEqual(parseSecFilings(filings2, 5), []);

  const filings3 = { filingDate: null, form: ['10-Q'] };
  assert.deepEqual(parseSecFilings(filings3, 5), []);
});

test('parseSecFilings handles empty arrays', () => {
  const filings = {
    filingDate: [],
    form: [],
    primaryDocDescription: [],
    accessionNumber: [],
  };

  const records = parseSecFilings(filings, 5);
  assert.equal(records.length, 0);
});

test('parseSecFilings handles mismatched array lengths', () => {
  // form이 더 짧으면, Math.min에 의해 제한됨
  const filings = {
    filingDate: ['2026-08-01', '2026-07-15', '2026-07-01'],
    form: ['10-Q', '8-K'], // 더 짧음
    primaryDocDescription: ['Doc1', 'Doc2', 'Doc3'],
    accessionNumber: ['Acc1', 'Acc2', 'Acc3'],
  };

  const records = parseSecFilings(filings, 5);
  // 가장 짧은 배열(form) 길이인 2만 처리됨
  assert.equal(records.length, 2);
});

test('parseSecFilings includes form 10-K, 10-Q, 8-K, 4', () => {
  const filings = {
    filingDate: ['2026-08-01', '2026-07-01', '2026-06-01', '2026-05-01'],
    form: ['10-K', '10-Q', '8-K', '4'],
    primaryDocDescription: ['Annual', 'Q2', 'Event', 'Insider'],
    accessionNumber: ['Acc1', 'Acc2', 'Acc3', 'Acc4'],
  };

  const records = parseSecFilings(filings, 10);
  assert.equal(records.length, 4);
  assert.equal(records[0].form, '10-K');
  assert.equal(records[1].form, '10-Q');
  assert.equal(records[2].form, '8-K');
  assert.equal(records[3].form, '4');
});
