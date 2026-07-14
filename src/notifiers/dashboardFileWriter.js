const fs = require('fs/promises');
const path = require('path');

async function writeDashboardFile(html, filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, html, 'utf8');
}

module.exports = { writeDashboardFile };
