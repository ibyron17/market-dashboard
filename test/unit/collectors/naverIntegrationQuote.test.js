const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseNaverIntegrationQuote,
  toNumberOrNull,
  parseNumericValue,
} = require('../../../src/collectors/naverIntegrationQuote');

const ticker = { symbol: '005930', label: '삼성전자' };

test('parses integration quote with all fields present', () => {
  const body = {
    totalInfos: [
      { code: 'per', value: '21.22배' },
      { code: 'eps', value: '12,372' },
      { code: 'cnsPer', value: '5.63배' },
      { code: 'cnsEps', value: '46,635' },
      { code: 'foreignRate', value: '46.53%' },
      { code: 'highPriceOf52Weeks', value: '380,000' },
      { code: 'lowPriceOf52Weeks', value: '67,500' },
      { code: 'marketValue', value: '1,534조 6,481억' },
    ],
    dealTrendInfos: [
      {
        bizdate: '20260731',
        foreignerPureBuyQuant: '+8,359,011',
        organPureBuyQuant: '3,618,959',
        individualPureBuyQuant: '-11,681,307',
      },
    ],
    consensusInfo: {
      createDate: '2026-07-30',
      recommMean: '4.04',
      priceTargetMean: '501,042',
    },
    researches: [
      { bnm: '교보증권', tit: '분기 실적 턴어라운드 가능성 높음', wdt: '20260731' },
      { bnm: 'NH투자증권', tit: 'AI 수혜주 진단', wdt: '20260730' },
    ],
  };

  const quote = parseNaverIntegrationQuote(body, ticker);

  assert.equal(quote.symbol, '005930');
  assert.equal(quote.label, '삼성전자');
  assert.equal(quote.per, 21.22);
  assert.equal(quote.eps, 12372);
  assert.equal(quote.estimatedPer, 5.63);
  assert.equal(quote.estimatedEps, 46635);
  assert.equal(quote.foreignOwnershipRate, 46.53);
  assert.equal(quote.high52Weeks, 380000);
  assert.equal(quote.low52Weeks, 67500);
  assert.equal(quote.marketValueText, '1,534조 6,481억');
  assert.equal(quote.investorFlow.date, '20260731');
  assert.equal(quote.investorFlow.foreign, 8359011);
  assert.equal(quote.consensus.opinionMean, 4.04);
  assert.equal(quote.consensus.priceTargetMean, 501042);
  assert.equal(quote.researchReports.length, 2);
});

test('handles missing fields gracefully (null values)', () => {
  const body = {
    totalInfos: [],
    dealTrendInfos: [],
    consensusInfo: null,
    researches: [],
  };

  const quote = parseNaverIntegrationQuote(body, ticker);

  assert.equal(quote.per, null);
  assert.equal(quote.eps, null);
  assert.equal(quote.investorFlow, null);
  assert.equal(quote.consensus, null);
  assert.equal(quote.researchReports.length, 0);
});

test('handles incomplete dealTrendInfos', () => {
  const body = {
    totalInfos: [],
    dealTrendInfos: [{ bizdate: '20260731' }], // 순매수 수량 없음
    consensusInfo: null,
    researches: [],
  };

  const quote = parseNaverIntegrationQuote(body, ticker);
  assert.equal(quote.investorFlow, null); // 유효한 필드 없으면 null
});

test('toNumberOrNull converts number strings with commas', () => {
  assert.equal(toNumberOrNull('12,372'), 12372);
  assert.equal(toNumberOrNull('46.53%', true), 46.53);
  assert.equal(toNumberOrNull(''), null);
  assert.equal(toNumberOrNull(null), null);
  assert.equal(toNumberOrNull('invalid'), null);
});

test('parseNumericValue extracts numbers from unit-suffixed strings', () => {
  assert.equal(parseNumericValue('21.22배'), 21.22);
  assert.equal(parseNumericValue('46.53%'), 46.53);
  assert.equal(parseNumericValue('380,000'), 380000);
  assert.equal(parseNumericValue(''), null);
  assert.equal(parseNumericValue(null), null);
});

test('limits research reports to 3 items', () => {
  const body = {
    totalInfos: [],
    dealTrendInfos: [],
    consensusInfo: null,
    researches: [
      { bnm: '증권1', tit: '제목1', wdt: '20260731' },
      { bnm: '증권2', tit: '제목2', wdt: '20260730' },
      { bnm: '증권3', tit: '제목3', wdt: '20260729' },
      { bnm: '증권4', tit: '제목4', wdt: '20260728' },
    ],
  };

  const quote = parseNaverIntegrationQuote(body, ticker);
  assert.equal(quote.researchReports.length, 3);
  assert.equal(quote.researchReports[0].brokerName, '증권1');
});

test('handles NaN and non-numeric values in totalInfos', () => {
  const body = {
    totalInfos: [
      { code: 'per', value: 'invalid배' },
      { code: 'eps', value: '' },
    ],
    dealTrendInfos: [],
    consensusInfo: null,
    researches: [],
  };

  const quote = parseNaverIntegrationQuote(body, ticker);
  assert.equal(quote.per, null);
  assert.equal(quote.eps, null);
});
