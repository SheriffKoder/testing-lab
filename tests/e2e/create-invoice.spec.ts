/**
 * @file tests/e2e/create-invoice.spec.ts
 * Playwright journey: create an invoice through the real browser and see it on the list.
 *
 * Playwright syntax used here:
 * - page.goto — open list
 * - getByRole / getByLabel — semantic locators (Item 3)
 * - fill / selectOption / click — user actions
 * - expect(...).toBeVisible / toHaveURL — outcome after persist
 *
 * Scope: create-invoice happy path through the real browser + app.
 * Not covered: validation messages (RTL), network mocks, edit/delete, isolation helpers.
 *
 * Used by: `npm run test:e2e` (Playwright, Chromium).
 * Used for: first complete E2E journey (Phase 2 Item 4).
 */

import { test, expect } from "@playwright/test";

test.describe("create invoice journey", () => {
  test("user can create an invoice and see it on the list", async ({ page }) => {
    // Time suffix keeps re-runs unique without Item 6 fixtures yet.
    const customer = `tl_playwright_create_invoice_${Date.now()}`;

    // 1. Open list
    await page.goto("/invoices");
    await expect(
      page.getByRole("heading", { name: "Invoices" }),
    ).toBeVisible();

    // 2. Go to create — list CTA is a link (Button asChild + Link).
    await page.getByRole("link", { name: "Create invoice" }).click();
    // URL makes the route change explicit (not a same-page modal).
    await expect(page).toHaveURL(/\/invoices\/new$/);
    await expect(
      page.getByRole("heading", { name: "Create invoice" }),
    ).toBeVisible();

    // 3–6. Fill recognizable fields (labels from CreateInvoiceForm).
    await page.getByLabel("Customer").fill(customer);
    await page.getByLabel("Amount").fill("42.50");
    await page.getByLabel("Status").selectOption("draft");
    await page.getByLabel("Due date").fill("2030-01-15");

    // 7. Submit — form submit control is a button (distinct from list link).
    await page.getByRole("button", { name: "Create invoice" }).click();

    // 8. Form “closes” = navigate back to list (no modal in this app).
    await expect(page).toHaveURL(/\/invoices$/);
    await expect(
      page.getByRole("heading", { name: "Invoices" }),
    ).toBeVisible();

    // 9. New row — scope to a table row so we assert list presence, not stray text.
    const row = page.getByRole("row").filter({ hasText: customer });
    await expect(row).toBeVisible();
  });
});
