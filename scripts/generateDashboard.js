const { generateDashboard } = require('../src/pipeline/generateDashboard');
const { logger } = require('../src/utils/logger');

generateDashboard().catch((err) => {
  logger.error('Dashboard generation failed', { error: err.message });
  process.exitCode = 1;
});
