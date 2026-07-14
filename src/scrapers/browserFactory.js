const { chromium } = require('playwright');
const { SCRAPE_USER_AGENT } = require('../config/constants');

async function withBrowser(fn) {
  const browser = await chromium.launch({ headless: true });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function createPage(browser) {
  return browser.newPage({ userAgent: SCRAPE_USER_AGENT });
}

module.exports = { withBrowser, createPage };
