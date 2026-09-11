import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/bdd",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:27050",
    trace: "on-first-retry",
    headless: true,
  },
  webServer: {
    command: "bun scripts/local-worker.ts test",
    port: 27050,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
