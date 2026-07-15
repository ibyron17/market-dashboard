function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// maxPerWindow/windowMs: 시간 창 안의 총 호출 수 제한.
// minGapMs: 연속 호출 사이의 최소 간격. Alpha Vantage 무료 키는 "초당 1회" 버스트
// 제한이 있어서, 여러 수집기가 동시에 시작해도 같은 순간에 요청이 몰리면 안 된다.
// acquire()를 프로미스 체인으로 직렬화해 동시 호출자도 순서대로 간격을 지키게 한다.
function createRateLimiter(maxPerWindow, windowMs, minGapMs = 0) {
  let timestamps = [];
  let chain = Promise.resolve();

  function acquire() {
    const turn = chain.then(async () => {
      for (;;) {
        const now = Date.now();
        timestamps = timestamps.filter((t) => now - t < windowMs);

        const lastAt = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;
        const gapWait = lastAt != null ? lastAt + minGapMs - now : 0;
        const windowWait = timestamps.length >= maxPerWindow ? timestamps[0] + windowMs - now : 0;
        const waitMs = Math.max(gapWait, windowWait, 0);

        if (waitMs <= 0) break;
        // eslint-disable-next-line no-await-in-loop
        await sleep(waitMs);
      }
      timestamps = [...timestamps, Date.now()];
    });
    chain = turn.catch(() => {});
    return turn;
  }

  return { acquire };
}

module.exports = { createRateLimiter };
