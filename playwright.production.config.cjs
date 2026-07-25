const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "production-smoke.spec.cjs",
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "https://neontablegames.com",
    trace: "retain-on-failure",
  },
});
