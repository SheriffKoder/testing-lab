/**
 * @file tests/e2e/invoices.spec.ts
 * Playwright smoke: /invoices loads in a real browser with list chrome visible.
 *
 * Playwright syntax used here:
 * - test / expect — Playwright Test runner (not Jest)
 * - page.goto("/invoices") — navigation relative to baseURL
 * - getByRole — semantic locator (same idea as RTL)
 * - locator.or() — either table (data) or empty-state copy (no rows)
 *
 * Scope: smoke only — page loads; heading + list chrome visible.
 * Not covered: create invoice journey, network mocks, multi-browser.
 *
 * Used by: `npm run test:e2e` (Playwright, Chromium).
 * Used for: proving Next route + real page load (Phase 2 Item 2).
 */

import { test, expect } from "@playwright/test";

test.describe("invoices list smoke", () => {
  test("loads /invoices with heading and list chrome", async ({ page }) => {
    // Relative path — resolved against playwright.config.ts baseURL.
    await page.goto("/invoices");

    // Same a11y idea as RTL: role + accessible name from <h1>Invoices</h1>.
    await expect(
      page.getByRole("heading", { name: "Invoices" }),
    ).toBeVisible();

    // Populated list → <table>. Empty list → dashed card (no table role).
    // Smoke accepts either: both prove the route rendered list chrome.
    const table = page.getByRole("table");
    const emptyState = page.getByText("No invoices yet");
    await expect(table.or(emptyState)).toBeVisible();
  });
});
