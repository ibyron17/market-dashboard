function createRateLimiter(maxPerWindow, windowMs) {
  let timestamps = [];

  async function acquire() {
    const now = Date.now();
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= maxPerWindow) {
      const waitMs = windowMs - (now - timestamps[0]);
      await new Promise((resolve) => {
        setTimeout(resolve, waitMs);
      });
    }

    timestamps = [...timestamps, Date.now()];
  }

  return { acquire };
}

module.exports = { createRateLimiter };
