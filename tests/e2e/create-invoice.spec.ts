/**
 * @file tests/e2e/create-invoice.spec.ts
 * Playwright journeys: create invoice success (with loading) and create failure.
 *
 * Playwright syntax used here:
 * - page.goto — open list / create
 * - getByRole / getByLabel — semantic locators (Item 3)
 * - fill / selectOption / click — user actions
 * - expect(...).toBeVisible / toBeDisabled / toHaveURL / toHaveValue — retried waits
 * - page.route — delay (success) or abort (error) the server-action POST
 *   (narrow Item 5 hook; deep network-mock curriculum is Item 7)
 *
 * Scope: loading → success + persistence failure → alert + fields kept.
 * Not covered: client validation messages (RTL), fixtures (Item 6), full mocks (Item 7).
 *
 * Used by: `npm run test:e2e` (Playwright, Chromium).
 * Used for: Phase 2 Item 4 journey deepened with Item 5 waiting/error coverage.
 */

import { test, expect } from "@playwright/test";

/** True when the browser is posting a Next.js server action for this page. */
function isServerActionPost(request: { method: () => string; headers: () => Record<string, string> }) {
  return (
    request.method() === "POST" && Boolean(request.headers()["next-action"])
  );
}

test.describe("create invoice journey", () => {
  test("user can create an invoice and see it on the list", async ({ page }) => {
    // Time suffix keeps re-runs unique without Item 6 fixtures yet.
    const customer = `tl_playwright_create_invoice_${Date.now()}`;

    // Slow the create server-action POST so “Saving…” is visible long enough to assert.
    // Create runs on the server (createInvoiceAction → Supabase); the browser only sees
    // a Next.js action POST to this route — not a client-side Supabase fetch.
    // Runs after the submit button is clicked.
    await page.route("**/invoices/new", async (route) => {
      if (isServerActionPost(route.request())) {
        // Delay inside the route handler (allowed by Item 5) — not waitForTimeout in the test body.
        await new Promise((resolve) => setTimeout(resolve, 750));
      }

      await route.continue();
    });

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

    // 8. Loading signal — wait on UI state, not a fixed sleep.
    // Accessible name becomes “Saving…” while isPending; button is disabled.
    const saving = page.getByRole("button", { name: "Saving…" });
    // Route delay makes the loading signal visible.
    await expect(saving).toBeVisible();
    // The button is disabled while the loading signal is visible.
    await expect(saving).toBeDisabled();

    // 9. Form “closes” = navigate back to list (no modal in this app).
    await expect(page).toHaveURL(/\/invoices$/);
    await expect(
      page.getByRole("heading", { name: "Invoices" }),
    ).toBeVisible();

    // 10. New row — scope to a table row so we assert list presence, not stray text.
    const row = page.getByRole("row").filter({ hasText: customer });
    await expect(row).toBeVisible();
  });

  test("shows an alert and keeps field values when create fails", async ({
    page,
  }) => {
    const customer = `tl_playwright_create_invoice_error_${Date.now()}`;
    const amount = "42.50";
    const dueDate = "2030-01-15";

    // Force persistence failure: abort the server-action POST (no second backend).
    // Form state stays controlled in React — abort must not clear the inputs.
    await page.route("**/invoices/new", async (route) => {
      if (isServerActionPost(route.request())) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });

    // Land directly on create — this case is about submit failure, not list navigation.
    await page.goto("/invoices/new");
    await expect(
      page.getByRole("heading", { name: "Create invoice" }),
    ).toBeVisible();

    await page.getByLabel("Customer").fill(customer);
    await page.getByLabel("Amount").fill(amount);
    await page.getByLabel("Status").selectOption("draft");
    await page.getByLabel("Due date").fill(dueDate);

    await page.getByRole("button", { name: "Create invoice" }).click();

    // CreateInvoiceView catch → role="alert"; do not navigate away.
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/invoices\/new$/);

    // Values retained so the user can fix and retry (not a silent reset).
    await expect(page.getByLabel("Customer")).toHaveValue(customer);
    await expect(page.getByLabel("Amount")).toHaveValue(amount);
    await expect(page.getByLabel("Status")).toHaveValue("draft");
    await expect(page.getByLabel("Due date")).toHaveValue(dueDate);
  });
});
