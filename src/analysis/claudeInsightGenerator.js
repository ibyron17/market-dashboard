const Anthropic = require('@anthropic-ai/sdk');
const { buildInsightPrompt, hasUsableData } = require('./promptBuilder');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } = require('../config/constants');

const SOURCE = 'claude-insight';

async function generateInsight(sections, config, deps = {}) {
  if (!hasUsableData(sections)) {
    return {
      status: 'error',
      source: SOURCE,
      error: '데이터 부족으로 인사이트 생략',
      fetchedAt: new Date().toISOString(),
    };
  }

  const client = deps.client || new Anthropic({ apiKey: config.anthropicApiKey });

  return withResultEnvelope(SOURCE, 'Claude insight generation failed', async () => {
    const prompt = buildInsightPrompt(sections);
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return { text };
  });
}

module.exports = { generateInsight };
