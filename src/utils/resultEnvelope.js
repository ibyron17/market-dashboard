const { logger } = require('./logger');

async function withResultEnvelope(source, failureMessage, fn) {
  try {
    const data = await fn();
    return { status: 'ok', source, data, fetchedAt: new Date().toISOString() };
  } catch (err) {
    logger.error(failureMessage, { error: err.message });
    return { status: 'error', source, error: err.message, fetchedAt: new Date().toISOString() };
  }
}

module.exports = { withResultEnvelope };
