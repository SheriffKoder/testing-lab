/**
 * @file tests/e2e/create-invoice.spec.ts
 * Playwright journeys: create invoice success (with loading) and create failure.
 *
 * Playwright syntax used here:
 * - page.goto — open list / create
 * - getByRole / getByLabel — semantic locators (Item 3)
 * - fill / selectOption / click — user actions
 * - expect(...).toBeVisible / toBeDisabled / toHaveURL / toHaveValue — retried waits
 * - page.route — intercept the browser-visible create POST
 * - route.continue — pass the request through (still real Next + Supabase)
 * - route.abort — fail the request in the browser (no DB write)
 *
 * Network notes:
 * - success: delay + continue → still real Supabase insert
 * - error: abort the next-action POST — no DB write
 * - does not intercept listInvoices (server-only RSC)
 * - fulfill (fake HTTP 500 body) skipped — Next action protocol is not cheap to fake
 *
 * Isolation notes:
 * - unique tl_pw_ customer per test via uniqueTlCustomer (no shared fixed name)
 * - does not rely on another spec having run first
 * - cleanup deferred (unique names are the isolation)
 *
 * Scope: loading → success + persistence failure → alert + fields kept.
 * Not covered: client validation messages (RTL), teardown janitor,
 *   list empty / list 500 via Playwright (Jest owns those; list is not a browser fetch).
 *
 * Used by: `npm run test:e2e` (Playwright, Chromium).
 * Used for: Phase 2 Item 4–7; Item 7 names real persist vs controlled failure.
 */

import { test, expect } from "@playwright/test";
import { uniqueTlCustomer } from "./helpers/unique-tl-customer";

/** True when the browser is posting a Next.js server action for this page. */
function isServerActionPost(request: { method: () => string; headers: () => Record<string, string> }) {
  return (
    request.method() === "POST" && Boolean(request.headers()["next-action"])
  );
}

test.describe("create invoice journey", () => {
  // Real: delay + continue still hits Next → Supabase. The list row is a real insert.
  test.describe("real persist", () => {
    test("user can create an invoice and see it on the list", async ({ page }) => {
      // uniqueTlCustomer — time + random so parallel workers cannot share a name.
      const customer = uniqueTlCustomer("create");

      // page.route matches browser traffic only. Create is a Next.js server-action POST
      // to this page (next-action header) — not a client Supabase fetch.
      // listInvoices runs on the server during RSC; Playwright cannot intercept it here.
      await page.route("**/invoices/new", async (route) => {
        if (isServerActionPost(route.request())) {
          // Delay inside the route handler (allowed by Item 5) — not waitForTimeout in the test body.
          await new Promise((resolve) => setTimeout(resolve, 750));
        }

        // continue — let the real action run. This test still proves persistence.
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
  });

  // Controlled: abort invents the failure. No Supabase write; UI contract only.
  test.describe("controlled network failure", () => {
    test("shows an alert and keeps field values when create fails", async ({
      page,
    }) => {
      const customer = uniqueTlCustomer("error");
      const amount = "42.50";
      const dueDate = "2030-01-15";

      // abort — fail the next-action POST in the browser (no second backend, no DB write).
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
});
