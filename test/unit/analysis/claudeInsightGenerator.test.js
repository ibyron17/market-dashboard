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
