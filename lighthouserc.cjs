/**
 * @file lighthouserc.cjs
 * Lighthouse CI config for Phase 4 Item 8 — production-style `/invoices` budgets.
 *
 * Used by: `npm run lhci` / GitHub Actions `lighthouse` job.
 * Collects against `next start` (not `next dev`). Budgets are few and
 * baseline-informed — see docs/performance/4-8-performance-ci.md.
 *
 * Calibration (lab, not score-100 cult):
 * - Item 3: Lighthouse mobile LCP ~1.5 s after list cache (`next start`)
 * - Item 4/2: CLS 0 in lab
 * - Item 6: ~167 kB JS transferred / 10 requests on `/invoices`
 * - Item 2: mobile perf score ~77 on `next dev` (floor with headroom for CI noise)
 */

module.exports = {
  ci: {
    collect: {
      // Caller must `npm run build` first. LHCI starts the production server.
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 120000,
      url: ["http://localhost:3000/invoices"],
      numberOfRuns: 3,
      settings: {
        // Mobile throttling defaults (matches Item 2/3 lab form factor).
        onlyCategories: ["performance"],
        // Required on GitHub-hosted runners (AppArmor / no userns sandbox).
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        // Soft floor — below known-good ~0.77 with room for runner noise.
        // Not 1.0 / 100.
        "categories:performance": [
          "warn",
          { minScore: 0.65, aggregationMethod: "median" },
        ],
        // Hard fail — obvious layout regression (lab CLS was 0; CWV "good" ≤ 0.1).
        "cumulative-layout-shift": [
          "error",
          { maxNumericValue: 0.1, aggregationMethod: "median" },
        ],
        // Soft — Item 3 after-cache LCP ~1.5 s; 4 s catches major regression.
        "largest-contentful-paint": [
          "warn",
          { maxNumericValue: 4000, aggregationMethod: "median" },
        ],
        // Hard fail — accidental JS balloon vs ~167 kB baseline (+ headroom).
        "resource-summary:script:size": [
          "error",
          { maxNumericValue: 400000, aggregationMethod: "median" },
        ],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
