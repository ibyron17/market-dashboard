const { sendDashboardNotification } = require('../src/pipeline/sendDashboardNotification');
const { logger } = require('../src/utils/logger');

sendDashboardNotification().catch((err) => {
  logger.error('Dashboard notification failed', { error: err.message });
  process.exitCode = 1;
});
