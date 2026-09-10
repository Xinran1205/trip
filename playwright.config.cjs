const { defineConfig } = require("@playwright/test");
const fs = require("node:fs");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
module.exports = defineConfig({
  testDir: "./tests", testMatch: "*.spec.cjs", timeout: 30000,
  expect: { timeout: 8000 }, workers: 2, reporter: "list",
  use: { headless: true, viewport: { width: 1440, height: 1000 },
    launchOptions: fs.existsSync(chrome) ? { executablePath: chrome } : {},
    screenshot: "only-on-failure", trace: "retain-on-failure" }
});
