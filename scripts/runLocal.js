require('dotenv').config();

const { runDailyReport } = require('../src/pipeline/runDailyReport');
const { logger } = require('../src/utils/logger');

runDailyReport().catch((err) => {
  logger.error('Local run failed', { error: err.message });
  process.exitCode = 1;
});
