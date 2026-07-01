import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (ADR-0011 item 1) — verify 와 분리 실행(k6 처럼).
 * 로컬 dev 서버(worker :8787 + web :5173)를 자동 기동하고, 시작 전 로컬 D1 을 시드로 초기화한다.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "corepack pnpm --filter @realtime-wait/worker dev",
      url: "http://localhost:8787/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "corepack pnpm --filter @realtime-wait/web dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
