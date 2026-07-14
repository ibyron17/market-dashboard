const fs = require('fs/promises');
const { sendTelegramMessage } = require('../notifiers/telegramNotifier');
const { loadConfig } = require('../config/env');
const { logger } = require('../utils/logger');
const { TELEGRAM_MESSAGE_OUTPUT_PATH } = require('../config/constants');

// Sends the message written by generateDashboard(). Run this only after the
// dashboard has actually been deployed, so the link in the message is live
// by the time the user receives it.
async function sendDashboardNotification(config = loadConfig(), deps = {}) {
  const {
    readTextFileFn = (filePath) => fs.readFile(filePath, 'utf8'),
    sendTelegramMessageFn = sendTelegramMessage,
  } = deps;

  try {
    const message = await readTextFileFn(TELEGRAM_MESSAGE_OUTPUT_PATH);
    await sendTelegramMessageFn(message, config);

    logger.info('Telegram notification sent');
  } catch (err) {
    logger.error('Telegram notification failed', { error: err.message });
    throw err;
  }
}

module.exports = { sendDashboardNotification };
