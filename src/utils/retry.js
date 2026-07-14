function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry(fn, options = {}) {
  const { retries = 2, baseDelayMs = 500 } = options;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(baseDelayMs * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

module.exports = { withRetry, sleep };
