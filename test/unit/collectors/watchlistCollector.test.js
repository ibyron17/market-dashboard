const test = require('node:test');
const assert = require('node:assert/strict');
const { collectWatchlist } = require('../../../src/collectors/watchlistCollector');

const config = { alphaVantageApiKey: 'test-key' };

function globalQuote(symbol, price, changePercent) {
  return {
    'Global Quote': {
      '01. symbol': symbol,
      '05. price': String(price),
      '10. change percent': `${changePercent}%`,
    },
  };
}

function naverQuote(name, closePrice, ratio, directionName) {
  return {
    datas: [
      {
        stockName: name,
        closePrice,
        fluctuationsRatio: String(ratio),
        compareToPreviousPrice: { name: directionName },
      },
    ],
  };
}

// 존재하지 않는 심볼은 기본 성공 응답으로 채워, 개별 테스트가 관심 심볼만 다루게 한다.
function buildDeps(overrides = {}) {
  return {
    fetchAlphaVantage: async (params) => globalQuote(params.symbol, 100, 1.0),
    fetchNaverStockQuote: async () => naverQuote('아무회사', '10,000', 1.0, 'RISING'),
    ...overrides,
  };
}

test('collects 5 themes, each mixing Korean and foreign companies', async () => {
  const deps = buildDeps({
    fetchAlphaVantage: async (params) => {
      assert.equal(params.function, 'GLOBAL_QUOTE');
      if (params.symbol === 'NVDA') return globalQuote('NVDA', 211.63, 2.1);
      return globalQuote(params.symbol, 100, 1.0);
    },
    fetchNaverStockQuote: async (code) => {
      if (code === '005930') return naverQuote('삼성전자', '279,500', 6.27, 'RISING');
      return naverQuote('아무회사', '10,000', 1.0, 'RISING');
    },
  });

  const result = await collectWatchlist(config, deps);

  assert.equal(result.status, 'ok');
  assert.equal(result.source, 'watchlist');
  assert.deepEqual(
    result.data.themes.map((t) => t.key),
    ['semiconductor', 'power', 'battery', 'construction', 'leisure'],
  );

  const semiconductor = result.data.themes.find((t) => t.key === 'semiconductor');
  assert.equal(semiconductor.companies.length, 5);

  const samsung = semiconductor.companies.find((c) => c.symbol === '005930');
  assert.equal(samsung.price, '279,500');
  assert.equal(samsung.changesPercentage, 6.27);
  assert.equal(samsung.currency, 'KRW');

  const nvidia = semiconductor.companies.find((c) => c.symbol === 'NVDA');
  assert.equal(nvidia.price, 211.63);
  assert.equal(nvidia.currency, 'USD');
});

test('every theme has 3 Korean and 2 foreign companies', async () => {
  const result = await collectWatchlist(config, buildDeps());

  result.data.themes.forEach((theme) => {
    const kr = theme.companies.filter((c) => c.currency === 'KRW');
    const us = theme.companies.filter((c) => c.currency === 'USD');
    assert.equal(kr.length, 3, `${theme.label} 테마의 국내 기업 수`);
    assert.equal(us.length, 2, `${theme.label} 테마의 해외 기업 수`);
  });
});

test('keeps the card alive and fills nulls when a single symbol fails', async () => {
  // FMP 402 사태의 재발 방지: 한 종목의 조회 실패가 관심 기업 카드 전체를
  // "데이터를 가져오지 못했습니다"로 만들면 안 된다.
  const deps = buildDeps({
    fetchAlphaVantage: async (params) => {
      if (params.symbol === 'TSM') throw new Error('quota exceeded');
      return globalQuote(params.symbol, 100, 1.0);
    },
  });

  const result = await collectWatchlist(config, deps);

  assert.equal(result.status, 'ok');
  const semiconductor = result.data.themes.find((t) => t.key === 'semiconductor');
  const tsm = semiconductor.companies.find((c) => c.symbol === 'TSM');
  assert.equal(tsm.price, null);
  assert.equal(tsm.changesPercentage, null);
  assert.equal(tsm.currency, 'USD');
});

test('fills null values when a Korean quote comes back empty', async () => {
  const deps = buildDeps({ fetchNaverStockQuote: async () => ({ datas: [] }) });

  const result = await collectWatchlist(config, deps);

  const semiconductor = result.data.themes.find((t) => t.key === 'semiconductor');
  const samsung = semiconductor.companies.find((c) => c.symbol === '005930');
  assert.equal(samsung.price, null);
  assert.equal(samsung.currency, 'KRW');
});
