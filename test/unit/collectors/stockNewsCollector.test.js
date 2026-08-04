const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStockNews, parseDatetime } = require('../../../src/collectors/stockNewsCollector');

test('parses stock news from grouped structure', () => {
  const body = [
    {
      items: [
        {
          officeName: '한국경제',
          titleFull: '삼성전자, 분기 실적 턴어라운드',
          datetime: '202608041327',
          mobileNewsUrl: 'https://news.naver.com/...',
        },
        {
          officeName: '매경이코노미',
          titleFull: 'AI 수혜주 진단',
          datetime: '202608031500',
          mobileNewsUrl: 'https://news.naver.com/...',
        },
      ],
    },
  ];

  const result = parseStockNews(body, '005930', 5);

  assert.equal(result.symbol, '005930');
  assert.equal(result.articles.length, 2);
  assert.equal(result.articles[0].officeName, '한국경제');
  assert.equal(result.articles[0].title, '삼성전자, 분기 실적 턴어라운드');
  assert.equal(result.articles[0].publishedAt.date, '2026-08-04');
  assert.equal(result.articles[0].publishedAt.time, '13:27');
});

test('prefers titleFull over title', () => {
  const body = [
    {
      items: [
        {
          officeName: '신문사',
          titleFull: 'Full Title Here',
          title: 'Short Title',
          datetime: '202608041327',
          mobileNewsUrl: 'https://news.naver.com/...',
        },
      ],
    },
  ];

  const result = parseStockNews(body, '005930', 5);
  assert.equal(result.articles[0].title, 'Full Title Here');
});

test('decodes HTML entities in titles', () => {
  const body = [
    {
      items: [
        {
          officeName: '신문사',
          titleFull: '삼성&quot;AI 투자&quot; 본격화 &amp; 실적 개선',
          datetime: '202608041327',
          mobileNewsUrl: 'https://news.naver.com/...',
        },
      ],
    },
  ];

  const result = parseStockNews(body, '005930', 5);
  assert.equal(result.articles[0].title, '삼성"AI 투자" 본격화 & 실적 개선');
});

test('limits results to specified limit', () => {
  const body = [
    {
      items: [
        { officeName: '사1', titleFull: '제목1', datetime: '202608041327', mobileNewsUrl: 'url1' },
        { officeName: '사2', titleFull: '제목2', datetime: '202608031500', mobileNewsUrl: 'url2' },
        { officeName: '사3', titleFull: '제목3', datetime: '202608021430', mobileNewsUrl: 'url3' },
        { officeName: '사4', titleFull: '제목4', datetime: '202608011200', mobileNewsUrl: 'url4' },
        { officeName: '사5', titleFull: '제목5', datetime: '202607311000', mobileNewsUrl: 'url5' },
        { officeName: '사6', titleFull: '제목6', datetime: '202607300900', mobileNewsUrl: 'url6' },
      ],
    },
  ];

  const result = parseStockNews(body, '005930', 3);
  assert.equal(result.articles.length, 3);
});

test('handles multiple groups (flattens)', () => {
  const body = [
    {
      items: [
        { officeName: '사1', titleFull: '제목1', datetime: '202608041327', mobileNewsUrl: 'url1' },
        { officeName: '사2', titleFull: '제목2', datetime: '202608031500', mobileNewsUrl: 'url2' },
      ],
    },
    {
      items: [
        { officeName: '사3', titleFull: '제목3', datetime: '202608021430', mobileNewsUrl: 'url3' },
      ],
    },
  ];

  const result = parseStockNews(body, '005930', 5);
  assert.equal(result.articles.length, 3);
});

test('skips items with missing required fields', () => {
  const body = [
    {
      items: [
        { officeName: '사1', titleFull: '제목1', datetime: '202608041327', mobileNewsUrl: 'url1' },
        { officeName: '사2', datetime: '202608031500', mobileNewsUrl: 'url2' }, // titleFull 없음
        { officeName: '사3', titleFull: '제목3', mobileNewsUrl: 'url3' }, // datetime 없음
      ],
    },
  ];

  const result = parseStockNews(body, '005930', 5);
  assert.equal(result.articles.length, 1);
});

test('handles empty body gracefully', () => {
  const result = parseStockNews([], '005930', 5);
  assert.equal(result.symbol, '005930');
  assert.equal(result.articles.length, 0);
});

test('parseDatetime converts YYYYMMDDHHmm to date and time', () => {
  assert.deepEqual(parseDatetime('202608041327'), { date: '2026-08-04', time: '13:27' });
  assert.deepEqual(parseDatetime('202601010000'), { date: '2026-01-01', time: '00:00' });
  assert.deepEqual(parseDatetime('202612312359'), { date: '2026-12-31', time: '23:59' });
});

test('parseDatetime returns null for invalid input', () => {
  assert.equal(parseDatetime(''), null);
  assert.equal(parseDatetime('12345'), null); // 너무 짧음
  assert.equal(parseDatetime(null), null);
  assert.equal(parseDatetime(undefined), null);
});

test('handles missing mobileNewsUrl', () => {
  const body = [
    {
      items: [
        { officeName: '사1', titleFull: '제목1', datetime: '202608041327' }, // URL 없음
      ],
    },
  ];

  const result = parseStockNews(body, '005930', 5);
  assert.equal(result.articles[0].url, null);
});

test('handles both titleFull absence and title fallback with entities', () => {
  const body = [
    {
      items: [
        {
          officeName: '사1',
          title: 'Title &quot;with&quot; entities',
          datetime: '202608041327',
          mobileNewsUrl: 'url1',
        },
      ],
    },
  ];

  const result = parseStockNews(body, '005930', 5);
  assert.equal(result.articles[0].title, 'Title "with" entities');
});
