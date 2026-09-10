/**
 * @file tests/e2e/invoices.spec.ts
 * Playwright smoke: /invoices (+ create page locator sanity) with semantic hooks.
 *
 * Playwright syntax used here:
 * - test / expect — Playwright Test runner (not Jest)
 * - page.goto — navigation relative to baseURL
 * - getByRole — role + accessible name (heading, link, table)
 * - getByLabel — form field by associated <label> text
 * - getByText — visible empty-state copy
 * - locator.or() — either table (data) or empty-state copy (no rows)
 *
 * Scope: smoke + semantic locators only (Phase 2 Item 3).
 * Not covered: fill/submit create journey (Item 4), CSS/nth selectors,
 * network mocks, multi-browser.
 *
 * Used by: `npm run test:e2e` (Playwright, Chromium).
 * Used for: proving Next routes + stable a11y locators (Item 3).
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

    // Header CTA is Button asChild + Link — accessible role is link, not button.
    await expect(
      page.getByRole("link", { name: "Create invoice" }),
    ).toBeVisible();

    // Populated list → <table>. Empty list → dashed card (no table role).
    // Smoke accepts either: both prove the route rendered list chrome.
    const table = page.getByRole("table");
    const emptyState = page.getByText("No invoices yet");
    await expect(table.or(emptyState)).toBeVisible();
  });
});

// Locator teaching only — visible hooks, no fill/submit (journey is Item 4).
test.describe("create invoice page locators", () => {
  test("exposes heading and labeled fields", async ({ page }) => {
    await page.goto("/invoices/new");

    await expect(
      page.getByRole("heading", { name: "Create invoice" }),
    ).toBeVisible();

    // Labels come from CreateInvoiceForm htmlFor + id pairing.
    await expect(page.getByLabel("Customer")).toBeVisible();
    await expect(page.getByLabel("Amount")).toBeVisible();
  });
});
