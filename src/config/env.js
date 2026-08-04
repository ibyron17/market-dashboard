const REQUIRED_KEYS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'ANTHROPIC_API_KEY',
  'ALPHA_VANTAGE_API_KEY',
  'FMP_API_KEY',
];

// 없어도 대시보드 전체는 정상 동작하고 해당 카드만 안내 문구로 대체되는 키.
const OPTIONAL_KEYS = ['FRED_API_KEY'];

function loadConfig(env = process.env) {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return Object.freeze({
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramChatId: env.TELEGRAM_CHAT_ID,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    alphaVantageApiKey: env.ALPHA_VANTAGE_API_KEY,
    fmpApiKey: env.FMP_API_KEY,
    fredApiKey: env.FRED_API_KEY,
  });
}

module.exports = { loadConfig, REQUIRED_KEYS, OPTIONAL_KEYS };
