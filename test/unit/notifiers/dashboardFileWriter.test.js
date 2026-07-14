const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { writeDashboardFile } = require('../../../src/notifiers/dashboardFileWriter');

test('creates missing directories and writes the file content', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dashboard-'));
  const filePath = path.join(tmpDir, 'nested', 'index.html');

  await writeDashboardFile('<html>hello</html>', filePath);

  const written = await fs.readFile(filePath, 'utf8');
  assert.equal(written, '<html>hello</html>');

  await fs.rm(tmpDir, { recursive: true, force: true });
});
