const test = require('node:test');
const assert = require('node:assert/strict');
const { sendTelegramMessage, splitMessage } = require('../../../src/notifiers/telegramNotifier');

const config = { telegramBotToken: 'test-token', telegramChatId: '12345' };

test('splitMessage returns a single chunk for short text', () => {
  const chunks = splitMessage('short message');
  assert.deepEqual(chunks, ['short message']);
});

test('splitMessage splits text longer than the telegram limit into multiple chunks', () => {
  const longText = 'a'.repeat(5000);
  const chunks = splitMessage(longText);

  assert.equal(chunks.length, 2);
  assert.equal(chunks.join(''), longText);
});

test('sendTelegramMessage posts each chunk in order', async () => {
  const calls = [];
  const fakePost = async (url, body) => {
    calls.push(body.text);
    return { data: { ok: true } };
  };

  const longText = 'b'.repeat(5000);
  await sendTelegramMessage(longText, config, { post: fakePost });

  assert.equal(calls.length, 2);
  assert.equal(calls.join(''), longText);
});
