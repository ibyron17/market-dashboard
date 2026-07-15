const test = require('node:test');
const assert = require('node:assert/strict');
const { parseNaverStockQuote, fetchKrTickerQuote } = require('../../../src/collectors/naverStockQuote');

const ticker = { symbol: '005930', label: '삼성전자', market: 'kr' };

function body(closePrice, ratio, directionName) {
  return {
    datas: [
      {
        stockName: '삼성전자',
        closePrice,
        fluctuationsRatio: ratio,
        compareToPreviousPrice: { name: directionName },
      },
    ],
  };
}

test('parses a rising quote with a positive percentage', () => {
  const quote = parseNaverStockQuote(body('279,500', '6.27', 'RISING'), ticker);

  assert.equal(quote.label, '삼성전자');
  assert.equal(quote.price, '279,500');
  assert.equal(quote.changesPercentage, 6.27);
  assert.equal(quote.currency, 'KRW');
});

test('applies a negative sign for falling quotes (ratio itself has no sign)', () => {
  const quote = parseNaverStockQuote(body('68,000', '1.45', 'FALLING'), ticker);
  assert.equal(quote.changesPercentage, -1.45);

  const lowerLimit = parseNaverStockQuote(body('68,000', '29.9', 'LOWER_LIMIT'), ticker);
  assert.equal(lowerLimit.changesPercentage, -29.9);
});

test('returns zero for flat quotes and nulls for empty payloads', () => {
  const flat = parseNaverStockQuote(body('68,000', '0.00', 'EVEN'), ticker);
  assert.equal(flat.changesPercentage, 0);

  const empty = parseNaverStockQuote({ datas: [] }, ticker);
  assert.equal(empty.price, null);
  assert.equal(empty.changesPercentage, null);
  assert.equal(empty.currency, 'KRW');
});

test('fetchKrTickerQuote passes the stock code to the fetcher', async () => {
  const deps = {
    fetchNaverStockQuote: async (code) => {
      assert.equal(code, '005930');
      return body('279,500', '6.27', 'RISING');
    },
  };

  const quote = await fetchKrTickerQuote(ticker, deps);
  assert.equal(quote.price, '279,500');
});
