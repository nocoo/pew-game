import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/bdd",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: "html",
  use: {
    baseURL: "http://localhost:23000",
    trace: "on-first-retry",
    headless: true,
  },
  webServer: {
    command: "bun run dev -- -p 23000",
    port: 23000,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
