const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseNaverChartXml,
  calculateMovingAverage,
  summarizeTrend,
} = require('../../../src/collectors/naverChartHistory');

test('sorts chart XML into ascending order regardless of response order', () => {
  const xmlText = `
    <chart>
      <item data="20260731|267000|267000|243000|262500|57883859" />
      <item data="20260730|265000|266000|264000|265500|45000000" />
      <item data="20260729|264000|265000|263000|264000|50000000" />
    </chart>
  `;

  const candles = parseNaverChartXml(xmlText);

  assert.equal(candles.length, 3);
  // 오름차순 확인 (과거→최근)
  assert.equal(candles[0].date, '20260729');
  assert.equal(candles[1].date, '20260730');
  assert.equal(candles[2].date, '20260731');
  // 마지막 캔들 확인
  assert.equal(candles[2].open, 267000);
  assert.equal(candles[2].high, 267000);
  assert.equal(candles[2].low, 243000);
  assert.equal(candles[2].close, 262500);
  assert.equal(candles[2].volume, 57883859);
});

// 회귀 방지: 실제 네이버 응답은 과거→최근(오름차순)으로 온다. 이걸 무조건 뒤집으면
// 가장 오래된 종가가 "최근 종가"로 잡혀 200일선 추세 판정이 정반대로 나온다.
test('keeps ascending order when the API already returns oldest-first', () => {
  const xmlText = `
    <chart>
      <item data="20260729|264000|265000|263000|100|50000000" />
      <item data="20260730|265000|266000|264000|200|45000000" />
      <item data="20260731|267000|267000|243000|300|57883859" />
    </chart>
  `;

  const candles = parseNaverChartXml(xmlText);

  assert.deepEqual(
    candles.map((candle) => candle.date),
    ['20260729', '20260730', '20260731'],
  );
  // 가장 최근 캔들이 배열 끝에 있어야 추세 요약이 최신 종가를 쓴다.
  assert.equal(candles.at(-1).close, 300);
  assert.equal(summarizeTrend(candles, 3).lastClose, 300);
});

test('throws error when no candle data found', () => {
  const xmlText = '<chart></chart>';
  assert.throws(
    () => parseNaverChartXml(xmlText),
    /No candle data found/,
  );
});

test('throws error when XML text is not a string', () => {
  assert.throws(
    () => parseNaverChartXml(null),
    /Chart XML text is required/,
  );
  assert.throws(
    () => parseNaverChartXml(undefined),
    /Chart XML text is required/,
  );
});

test('calculateMovingAverage returns average of last N closes', () => {
  const closes = [1000, 1100, 1200, 1300, 1400]; // 5개
  const ma = calculateMovingAverage(closes, 3);

  // 마지막 3개: (1200 + 1300 + 1400) / 3 = 3900 / 3 = 1300
  assert.equal(ma, 1300);
});

test('calculateMovingAverage returns null when data insufficient', () => {
  const closes = [1000, 1100];
  const ma = calculateMovingAverage(closes, 5);
  assert.equal(ma, null);
});

test('calculateMovingAverage handles default period (200)', () => {
  const closes = Array.from({ length: 200 }, (_, i) => 10000 + i * 10);
  const ma = calculateMovingAverage(closes); // default 200
  assert(ma !== null);
});

test('summarizeTrend calculates deviation percentage', () => {
  const candles = [
    { date: '20260701', open: 10000, high: 10100, low: 9900, close: 10000, volume: 1000000 },
  ];

  // 200일 이동평균 데이터 추가 (200개 필요)
  for (let i = 1; i < 200; i += 1) {
    candles.push({
      date: String(20260701 + i),
      open: 10000,
      high: 10100,
      low: 9900,
      close: 10000,
      volume: 1000000,
    });
  }

  // 마지막 캔들 (마지막에 추가, 가격 10500)
  candles.push({
    date: '20260831',
    open: 10400,
    high: 10500,
    low: 10300,
    close: 10500,
    volume: 2000000,
  });

  const trend = summarizeTrend(candles);
  assert.equal(trend.lastClose, 10500);
  assert(trend.movingAverage !== null);
  assert(trend.deviationPercent !== null);
  assert.equal(trend.isAbove, true);
});

test('summarizeTrend returns null when candles is empty', () => {
  const trend = summarizeTrend([]);
  assert.equal(trend, null);
});

test('summarizeTrend handles insufficient data for moving average', () => {
  const candles = [
    { date: '20260731', open: 10000, high: 10100, low: 9900, close: 10000, volume: 1000000 },
  ];

  const trend = summarizeTrend(candles);
  assert.equal(trend.lastClose, 10000);
  assert.equal(trend.movingAverage, null);
  assert.equal(trend.deviationPercent, null);
});

test('handles Korean characters gracefully (ignored in numeric extraction)', () => {
  // EUC-KR로 깨진 한글이 포함되어도 정규식은 숫자만 추출
  const xmlText = `
    <chart>
      <item name="삼성전자" data="20260731|267000|267000|243000|262500|57883859" />
      <item name="SK하이닉스" data="20260730|265000|266000|264000|265500|45000000" />
    </chart>
  `;

  const candles = parseNaverChartXml(xmlText);
  assert.equal(candles.length, 2);
  assert.equal(candles[0].close, 265500);
  assert.equal(candles[1].close, 262500);
});
