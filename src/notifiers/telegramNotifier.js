const axios = require('axios');
const { TELEGRAM_MAX_MESSAGE_LENGTH } = require('../config/constants');
const { withRetry } = require('../utils/retry');
const { logger } = require('../utils/logger');

function splitMessage(text) {
  if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    return [text];
  }

  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH));
    remaining = remaining.slice(TELEGRAM_MAX_MESSAGE_LENGTH);
  }
  return chunks;
}

async function sendTelegramMessage(text, config, deps = { post: axios.post }) {
  const chunks = splitMessage(text);
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop
    await withRetry(() =>
      deps.post(url, {
        chat_id: config.telegramChatId,
        text: chunk,
        parse_mode: 'Markdown',
      }),
    );
  }

  logger.info('Telegram message sent', { chunkCount: chunks.length });
}

module.exports = { sendTelegramMessage, splitMessage };
