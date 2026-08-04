const test = require('node:test');
const assert = require('node:assert/strict');
const { parseNaverMarketList, toNumberOrNull } = require('../../../src/collectors/naverMarketList');

test('parses market list with rising and falling stocks', () => {
  const body = {
    stocks: [
      {
        itemCode: '005930',
        stockName: '삼성전자',
        closePrice: '262,500',
        fluctuationsRatio: '6.27',
        compareToPreviousPrice: { name: 'RISING' },
        marketValueHangeul: '1,534조 6,481억',
        accumulatedTradingValue: '15,234,567,890,000',
      },
      {
        itemCode: '000660',
        stockName: 'SK하이닉스',
        closePrice: '180,500',
        fluctuationsRatio: '3.21',
        compareToPreviousPrice: { name: 'FALLING' },
        marketValueHangeul: '845조 3,210억',
        accumulatedTradingValue: '8,765,432,100,000',
      },
    ],
  };

  const result = parseNaverMarketList(body, 'KOSPI');

  assert.equal(result.market, 'KOSPI');
  assert.equal(result.stocks.length, 2);
  assert.equal(result.stocks[0].symbol, '005930');
  assert.equal(result.stocks[0].changesPercentage, 6.27);
  assert.equal(result.stocks[1].changesPercentage, -3.21);
});

test('handles EVEN direction (zero change)', () => {
  const body = {
    stocks: [
      {
        itemCode: '003220',
        stockName: '대선아C',
        closePrice: '100,000',
        fluctuationsRatio: '0.00',
        compareToPreviousPrice: { name: 'EVEN' },
        marketValueHangeul: '500조',
        accumulatedTradingValue: '1,000,000,000',
      },
    ],
  };

  const result = parseNaverMarketList(body, 'KOSDAQ');
  assert.equal(result.stocks[0].changesPercentage, 0);
});

test('handles UPPER_LIMIT and LOWER_LIMIT directions', () => {
  const body = {
    stocks: [
      {
        itemCode: '123456',
        stockName: 'Stock1',
        closePrice: '50,000',
        fluctuationsRatio: '30.00',
        compareToPreviousPrice: { name: 'UPPER_LIMIT' },
        marketValueHangeul: '100조',
        accumulatedTradingValue: '500,000,000',
      },
      {
        itemCode: '654321',
        stockName: 'Stock2',
        closePrice: '30,000',
        fluctuationsRatio: '30.00',
        compareToPreviousPrice: { name: 'LOWER_LIMIT' },
        marketValueHangeul: '100조',
        accumulatedTradingValue: '500,000,000',
      },
    ],
  };

  const result = parseNaverMarketList(body, 'KOSPI');
  assert.equal(result.stocks[0].changesPercentage, 30); // UPPER_LIMIT = up
  assert.equal(result.stocks[1].changesPercentage, -30); // LOWER_LIMIT = down
});

test('handles missing direction information', () => {
  const body = {
    stocks: [
      {
        itemCode: '005930',
        stockName: '삼성전자',
        closePrice: '262,500',
        fluctuationsRatio: '6.27',
        compareToPreviousPrice: null,
        marketValueHangeul: '1,534조 6,481억',
        accumulatedTradingValue: '15,234,567,890,000',
      },
    ],
  };

  const result = parseNaverMarketList(body, 'KOSPI');
  // direction이 null이면 양수로 처리됨 (기본)
  assert.equal(result.stocks[0].changesPercentage, 6.27);
});

test('throws error on invalid market list response', () => {
  const body = null;
  assert.throws(
    () => parseNaverMarketList(body, 'KOSPI'),
    /Invalid market list response/,
  );

  const bodyNoStocks = { stocks: null };
  assert.throws(
    () => parseNaverMarketList(bodyNoStocks, 'KOSPI'),
    /Invalid market list response/,
  );
});

test('toNumberOrNull converts prices with commas', () => {
  assert.equal(toNumberOrNull('262,500'), 262500);
  assert.equal(toNumberOrNull('1,534,600,000,000,000'), 1534600000000000);
  assert.equal(toNumberOrNull(''), null);
  assert.equal(toNumberOrNull(null), null);
  assert.equal(toNumberOrNull('invalid'), null);
});

test('handles marketValueText and tradingValueText as strings', () => {
  const body = {
    stocks: [
      {
        itemCode: '005930',
        stockName: '삼성전자',
        closePrice: '262,500',
        fluctuationsRatio: '6.27',
        compareToPreviousPrice: { name: 'RISING' },
        marketValueHangeul: '1,534조 6,481억',
        accumulatedTradingValue: '15,234조 5,678억',
      },
    ],
  };

  const result = parseNaverMarketList(body, 'KOSPI');
  assert.equal(result.stocks[0].marketValueText, '1,534조 6,481억');
  assert.equal(result.stocks[0].tradingValueText, '15,234조 5,678억');
});
