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

    // 호출이 성공해도 본문이 비어 올 수 있다(예: max_tokens를 사고 토큰이 모두 소진해
    // 답변이 잘린 경우). 이걸 성공으로 넘기면 대시보드에 빈 카드가 조용히 발행되므로
    // 실패로 처리하고, 원인을 로그로 구분할 수 있게 stop_reason을 함께 남긴다.
    if (!text) {
      throw new Error(`Claude returned no text (stop_reason: ${response.stop_reason})`);
    }

    return { text };
  });
}

module.exports = { generateInsight };
