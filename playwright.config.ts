/**
 * @file playwright.config.ts
 * Playwright E2E config: Chromium smoke tests under tests/e2e against Next.js.
 *
 * Used by: `npm run test:e2e` / `test:e2e:headed` / `test:e2e:ui` (Playwright CLI).
 * Used for: pointing specs at FSD `tests/e2e/`, starting (or reusing) `next dev`,
 * and running a single Chromium project — separate from Jest (`npm test`).
 *
 * Steps:
 * 1. Set testDir to FSD tests/e2e (not a second root e2e/).
 * 2. baseURL so specs use relative paths like page.goto("/invoices")
 *    (override with PLAYWRIGHT_BASE_URL when :3000 is taken).
 * 3. webServer starts npm run dev and waits for that same baseURL.
 * 4. Chromium-only project for Item 2; Firefox/WebKit later if needed.
 */

import { defineConfig, devices } from "@playwright/test";

// Override when port 3000 is already taken by another app, e.g.:
// PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Local: one folder per run so reports and traces are not overwritten.
// CI: flat dirs — GitHub already versions the artifact by run.
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const htmlReportDir = process.env.CI
  ? "playwright-report"
  : `playwright-report/${runStamp}`;
const testResultsDir = process.env.CI
  ? "test-results"
  : `test-results/${runStamp}`;
// Open a saved local report: npx playwright show-report playwright-report/<stamp>

export default defineConfig({
  // Specs live under the FSD tests/ unit (alongside unit/ and integration/).
  testDir: "./tests/e2e",

  fullyParallel: true,
  // Fail the build on CI if test.only was left in a committed spec.
  forbidOnly: !!process.env.CI,
  // Local: fail fast. CI: retry flaky network/timing once or twice.
  retries: process.env.CI ? 2 : 0,

  // list = terminal. html writes htmlReportDir (gitignored). Never
  // auto-open: CI has no display; locally pass the stamped folder to
  // `npx playwright show-report`.
  reporter: [["list"], ["html", { open: "never", outputFolder: htmlReportDir }]],
  outputDir: testResultsDir,

  use: {
    // Relative goto("/invoices") resolves here — does not start the server.
    baseURL,
    // Keep traces light until debugging items; capture on first CI retry.
    trace: "on-first-retry",
  },

  // Start Next for the suite; reuse a local `next dev` when not on CI.
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
