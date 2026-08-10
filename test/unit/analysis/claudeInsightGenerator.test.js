const test = require('node:test');
const assert = require('node:assert/strict');
const { generateInsight } = require('../../../src/analysis/claudeInsightGenerator');

const config = { anthropicApiKey: 'test-key' };

test('skips the API call and returns error when no section has usable data', async () => {
  const sections = { usMarket: { status: 'error' } };

  const fakeClient = {
    messages: {
      create: async () => {
        throw new Error('should not be called');
      },
    },
  };

  const result = await generateInsight(sections, config, { client: fakeClient });

  assert.equal(result.status, 'error');
  assert.match(result.error, /데이터 부족/);
});

test('returns ok status with generated text on success', async () => {
  const sections = { usMarket: { status: 'ok', data: { indices: [] } } };

  const fakeClient = {
    messages: {
      create: async () => ({ content: [{ type: 'text', text: '오늘 시장은 안정적입니다.' }] }),
    },
  };

  const result = await generateInsight(sections, config, { client: fakeClient });

  assert.equal(result.status, 'ok');
  assert.equal(result.data.text, '오늘 시장은 안정적입니다.');
});

// 회귀 방지: 사고 토큰이 max_tokens를 모두 소진하면 호출은 성공(200)하면서 text 블록이
// 하나도 없는 응답이 온다. 이걸 성공으로 넘기면 대시보드에 빈 인사이트 카드가 발행된다.
test('treats a response with no text blocks as a failure and reports the stop reason', async () => {
  const sections = { usMarket: { status: 'ok', data: {} } };

  const fakeClient = {
    messages: {
      create: async () => ({
        content: [{ type: 'thinking', thinking: '' }],
        stop_reason: 'max_tokens',
      }),
    },
  };

  const result = await generateInsight(sections, config, { client: fakeClient });

  assert.equal(result.status, 'error');
  assert.match(result.error, /no text/);
  assert.match(result.error, /max_tokens/);
});

test('treats whitespace-only text as a failure', async () => {
  const sections = { usMarket: { status: 'ok', data: {} } };

  const fakeClient = {
    messages: {
      create: async () => ({ content: [{ type: 'text', text: '   \n' }], stop_reason: 'end_turn' }),
    },
  };

  const result = await generateInsight(sections, config, { client: fakeClient });

  assert.equal(result.status, 'error');
});

test('returns error status without throwing when the API call fails', async () => {
  const sections = { usMarket: { status: 'ok', data: {} } };

  const fakeClient = {
    messages: {
      create: async () => {
        throw new Error('anthropic api down');
      },
    },
  };

  const result = await generateInsight(sections, config, { client: fakeClient });

  assert.equal(result.status, 'error');
  assert.equal(result.error, 'anthropic api down');
});
