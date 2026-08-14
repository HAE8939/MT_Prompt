import { defineConfig, devices } from "@playwright/test";

const browser = process.env.CI === "true" ? {} : { channel: "chrome" as const };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...browser } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !!process.env.PW_REUSE_SERVER,
    timeout: 120_000,
  },
});
