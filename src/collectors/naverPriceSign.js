/**
 * 네이버 API의 부호 없는 등락률에 방향 정보를 조합해 부호 있는 숫자로 변환.
 * 네이버 API 응답에서 fluctuationsRatio("6.27")는 절댓값만 있고,
 * 방향은 compareToPreviousPrice.name(RISING/FALLING/EVEN/UPPER_LIMIT/LOWER_LIMIT)에만 있다.
 * @param {string|number} ratioText - 부호 없는 등락률 (예: "6.27", "0.00")
 * @param {string} directionName - 방향 명 (예: "RISING", "FALLING", "EVEN")
 * @returns {number|null} 부호 있는 등락률 또는 null
 */
function applyDirectionSign(ratioText, directionName) {
  if (ratioText == null || String(ratioText).trim() === '') {
    return null;
  }

  const ratio = Number(String(ratioText).replace(/,/g, ''));
  if (!Number.isFinite(ratio)) {
    return null;
  }

  const magnitude = Math.abs(ratio);
  if (directionName === 'FALLING' || directionName === 'LOWER_LIMIT') {
    return -magnitude;
  }
  if (directionName === 'EVEN') {
    return 0;
  }
  // RISING, UPPER_LIMIT, 또는 unknown
  return magnitude;
}

module.exports = { applyDirectionSign };
