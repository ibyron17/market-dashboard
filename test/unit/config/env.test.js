const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig, REQUIRED_KEYS, OPTIONAL_KEYS } = require('../../../src/config/env');

function requiredEnv(overrides = {}) {
  return {
    TELEGRAM_BOT_TOKEN: 'bot',
    TELEGRAM_CHAT_ID: 'chat',
    ANTHROPIC_API_KEY: 'anthropic',
    ALPHA_VANTAGE_API_KEY: 'av',
    FMP_API_KEY: 'fmp',
    ...overrides,
  };
}

test('loads every required key into the config object', () => {
  const config = loadConfig(requiredEnv());

  assert.equal(config.telegramBotToken, 'bot');
  assert.equal(config.anthropicApiKey, 'anthropic');
  assert.equal(config.alphaVantageApiKey, 'av');
  assert.equal(config.fmpApiKey, 'fmp');
});

test('throws and names the missing key when a required one is absent', () => {
  const env = requiredEnv();
  delete env.ALPHA_VANTAGE_API_KEY;

  assert.throws(() => loadConfig(env), /ALPHA_VANTAGE_API_KEY/);
});

// FRED는 선택 키다. 없다고 대시보드 전체가 죽으면 안 되고, 해당 카드만
// 안내 문구로 대체돼야 한다(renderMacroIndicators가 configured:false를 처리).
test('treats the FRED key as optional so the dashboard still builds without it', () => {
  const config = loadConfig(requiredEnv());

  assert.equal(config.fredApiKey, undefined);
  assert.ok(!REQUIRED_KEYS.includes('FRED_API_KEY'));
  assert.ok(OPTIONAL_KEYS.includes('FRED_API_KEY'));
});

// 회귀 방지: 수집기는 config.fredApiKey(camelCase)를 읽는다. loadConfig가
// 이 이름으로 넘겨주지 않으면 시크릿을 등록해도 계속 "미설정"으로 나온다.
test('passes the FRED key through as fredApiKey when it is set', () => {
  const config = loadConfig(requiredEnv({ FRED_API_KEY: 'fred-test-value' }));

  assert.equal(config.fredApiKey, 'fred-test-value');
});
