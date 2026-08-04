const axios = require('axios');
const { withRetry } = require('../utils/retry');
const { withResultEnvelope } = require('../utils/resultEnvelope');
const { FRED_BASE_URL, FRED_SERIES } = require('../config/constants');

/**
 * 단일 FRED 시리즈 데이터 조회.
 * @param {string} seriesId - FRED 시리즈 ID (예: "T10Y2Y")
 * @param {string} apiKey - FRED API 키
 * @param {Object} options - {limit?: number, timeoutMs?: number}
 * @returns {Promise<Object>} {seriesId, label, unit, latestValue, latestDate, ...}
 */
async function fetchFredSeries(seriesId, apiKey, { limit = 10, timeoutMs = 10000 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(FRED_BASE_URL, {
      params: {
        series_id: seriesId,
        api_key: apiKey,
        file_type: 'json',
        sort_order: 'desc',
        limit,
      },
      timeout: timeoutMs,
    });

    if (!response.data || !Array.isArray(response.data.observations)) {
      throw new Error(`No observations for ${seriesId}`);
    }

    return response.data.observations;
  });
}

/**
 * FRED API 응답(관측치 배열) 파싱.
 * value === '.'는 결측이므로 건너뜀.
 * @param {Array<Object>} observations - [{date, value}]
 * @param {Object} seriesInfo - {id, label, unit}
 * @returns {Object|null} {seriesId, label, unit, latestValue, latestDate, ...} 또는 null (모두 결측)
 */
function parseFredObservations(observations, seriesInfo) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return null;
  }

  // 결측이 아닌 데이터만 필터링 (내림차순이므로 최신이 먼저)
  const validObs = observations.filter((obs) => obs.value && obs.value !== '.');

  if (validObs.length === 0) {
    return null;
  }

  const latest = validObs[0];
  const latestValue = Number(latest.value);

  if (!Number.isFinite(latestValue)) {
    return null;
  }

  return {
    seriesId: seriesInfo.id,
    label: seriesInfo.label,
    unit: seriesInfo.unit,
    latestValue: Math.round(latestValue * 100) / 100, // 소수 2자리
    latestDate: latest.date,
  };
}

/**
 * 다중 FRED 시리즈 조회 및 파싱.
 * API 키가 없으면 configured: false를 반환하고 인디케이터는 빈 배열.
 * @param {Object} config - {fredApiKey?} — loadConfig()가 돌려주는 설정 객체
 * @param {Object} deps - 의존성 {timeoutMs?}
 * @returns {Promise<Object>} {configured: boolean, indicators: [...]}
 */
async function collectFredMacroIndicators(config = {}, deps = {}) {
  // API 키 체크
  if (!config.fredApiKey) {
    return {
      status: 'ok',
      source: 'fredMacroIndicators',
      data: {
        configured: false,
        indicators: [],
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  try {
    const indicators = [];
    const seriesIds = Object.keys(FRED_SERIES);

    // 모든 시리즈 병렬 조회
    const promises = seriesIds.map((id) =>
      fetchFredSeries(id, config.fredApiKey, { limit: 10, timeoutMs: deps.timeoutMs || 10000 })
        .then((observations) => {
          const parsed = parseFredObservations(observations, FRED_SERIES[id]);
          if (parsed) indicators.push(parsed);
        })
        .catch(() => {
          // 개별 시리즈 실패는 무시. 해당 인디케이터만 빠짐.
        }),
    );

    await Promise.all(promises);

    return {
      status: 'ok',
      source: 'fredMacroIndicators',
      data: {
        configured: true,
        indicators,
      },
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: 'error',
      source: 'fredMacroIndicators',
      error: err.message,
      data: {
        configured: false,
        indicators: [],
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  fetchFredSeries,
  parseFredObservations,
  collectFredMacroIndicators,
};
