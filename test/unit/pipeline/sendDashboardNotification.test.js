const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sendDashboardNotification,
} = require('../../../src/pipeline/sendDashboardNotification');

const config = {
  telegramBotToken: 'token',
  telegramChatId: 'chat',
  anthropicApiKey: 'key',
  alphaVantageApiKey: 'key',
  fmpApiKey: 'key',
};

test('reads the pending message file and sends it via telegram', async () => {
  let sentMessage = null;

  const deps = {
    readTextFileFn: async (filePath) => {
      assert.equal(filePath, 'artifacts/telegram-message.txt');
      return 'dashboard link message';
    },
    sendTelegramMessageFn: async (text) => {
      sentMessage = text;
    },
  };

  await sendDashboardNotification(config, deps);

  assert.equal(sentMessage, 'dashboard link message');
});

test('propagates the error when the message file is missing', async () => {
  const deps = {
    readTextFileFn: async () => {
      throw new Error('ENOENT: no such file');
    },
    sendTelegramMessageFn: async () => {},
  };

  await assert.rejects(() => sendDashboardNotification(config, deps), /ENOENT/);
});

test('propagates the error when telegram sending itself fails', async () => {
  const deps = {
    readTextFileFn: async () => 'dashboard link message',
    sendTelegramMessageFn: async () => {
      throw new Error('telegram unreachable');
    },
  };

  await assert.rejects(() => sendDashboardNotification(config, deps), /telegram unreachable/);
});
