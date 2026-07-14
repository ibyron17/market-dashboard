require('dotenv').config();

const { generateDashboard } = require('../src/pipeline/generateDashboard');
const { sendDashboardNotification } = require('../src/pipeline/sendDashboardNotification');
const { logger } = require('../src/utils/logger');

// Local dev convenience: there's no separate Pages deploy step here, so the
// dashboard file on disk IS the final artifact — safe to notify right after.
async function main() {
  await generateDashboard();
  await sendDashboardNotification();
}

main().catch((err) => {
  logger.error('Local run failed', { error: err.message });
  process.exitCode = 1;
});
