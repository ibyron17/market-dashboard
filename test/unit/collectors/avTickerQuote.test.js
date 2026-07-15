const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchAvTickerQuote } = require('../../../src/collectors/avTickerQuote');

const config = { alphaVantageApiKey: 'test-key' };
const ticker = { symbol: 'GEV', label: 'GE 버노바' };

test('parses price and change percent from the Global Quote payload', async () => {
  const deps = {
    fetchAlphaVantage: async (params, options) => {
      assert.equal(params.function, 'GLOBAL_QUOTE');
      assert.equal(params.symbol, 'GEV');
      assert.equal(options.apiKey, 'test-key');
      return {
        'Global Quote': {
          '01. symbol': 'GEV',
          '05. price': '1066.0100',
          '10. change percent': '2.2453%',
        },
      };
    },
  };

  const quote = await fetchAvTickerQuote(ticker, config, deps);

  assert.equal(quote.label, 'GE 버노바');
  assert.equal(quote.symbol, 'GEV');
  assert.equal(quote.price, 1066.01);
  assert.equal(quote.changesPercentage, 2.2453);
});

test('returns nulls when the payload has no Global Quote', async () => {
  const deps = { fetchAlphaVantage: async () => ({}) };

  const quote = await fetchAvTickerQuote(ticker, config, deps);

  assert.equal(quote.price, null);
  assert.equal(quote.changesPercentage, null);
});

test('returns nulls when the quote fields are not numeric', async () => {
  const deps = {
    fetchAlphaVantage: async () => ({
      'Global Quote': { '05. price': '', '10. change percent': '' },
    }),
  };

  const quote = await fetchAvTickerQuote(ticker, config, deps);

  assert.equal(quote.price, null);
  assert.equal(quote.changesPercentage, null);
});
