# E2E User Journeys

> Phase 2 · Item 4 · Concepts + project wiring.
>
> Builds on [`2-3-playwright-locators.md`](./2-3-playwright-locators.md) and
> [`2-1-invoice-test-boundaries.md`](./2-1-invoice-test-boundaries.md)
> (create invoice = **Both** — this item is the Playwright half).
>
> Next: loading / error waits — Item 5
> ([`2-5-playwright-waiting.md`](./2-5-playwright-waiting.md)); then isolation —
> Item 6 ([`2-6-playwright-test-isolation.md`](./2-6-playwright-test-isolation.md)).

Item 2–3 proved the app loads and that we can find elements semantically.
Item 4 protects a **whole workflow**: a real user creating an invoice in a real
browser.

> E2E tests should protect outcomes.
> The test should read like something a QA engineer or product manager could
> understand.

---

## What makes a good E2E journey

A good journey:

1. **Starts where a user starts** — open a URL, see the page, click real controls.
2. **Follows a product story** — not “assert every button exists.”
3. **Ends on an observable outcome** — data appears, URL changes, success chrome.
4. **Uses the browser only** — no calling React handlers, no poking component state.
5. **Stays readable** — steps match how you would demo the feature.
6. **Asserts sparingly** — enough to prove the outcome; not a second unit suite.

Bad journey smell: twenty tiny E2E tests that each click one control and assert
one class name.

---

## Happy paths, critical paths, business-critical workflows

| Term | Meaning | Invoice example |
|---|---|---|
| **Happy path** | Typical success with valid input | Create invoice → see it on the list |
| **Critical path** | Path that must work or the product fails its job | Same create flow — invoices cannot be added otherwise |
| **Business-critical** | Revenue / trust / compliance impact | For this lab: create + list is the core workflow |

Item 4 focuses on the **happy / critical create path**. Validation edge cases,
keyboard-only quirks, and formatter strings stay in Jest + RTL (Phase 1).

---

## One meaningful journey vs many tiny E2E tests

**Many tiny E2E tests:**

```text
Test every button independently
```

Slow, brittle, duplicates RTL. Breaks often when CSS or layout shifts. Gives
false confidence (“all buttons exist”) without proving the workflow.

**One meaningful journey:**

```text
Test that a user can successfully create an invoice
```

Covers navigation, form fill, submit, persistence, and list refresh in one
story. Costs more per run than a unit test, but buys confidence RTL mocks cannot:
**the pieces work together for real.**

Prefer a few journey specs over dozens of browser unit-tests.

---

## Tests should resemble actual user behavior

Do:

```ts
await page.goto("/invoices");
await page.getByRole("link", { name: "Create invoice" }).click();
await page.getByLabel("Customer").fill(uniqueTlCustomer("create"));
// … amount, status, due date …
await page.getByRole("button", { name: "Create invoice" }).click();
await expect(page).toHaveURL(/\/invoices$/);
await expect(page.getByRole("row").filter({ hasText: customer })).toBeVisible();
```

Do **not**:

- Import `CreateInvoiceForm` and call `onSubmit` from a Playwright file
- Assert React state or Redux-like stores
- Hit Supabase with a raw client *instead of* the UI (setup helpers later are OK;
  the journey itself still goes through the browser)
- Use `page.waitForTimeout(2000)` to “wait for save” (Item 5 — wait on outcome)

---

## Test readability

A PM should roughly understand the test from the titles and steps:

```ts
test.describe("create invoice journey", () => {
  test("user can create an invoice and see it on the list", async ({ page }) => {
    // 1. Open list
    // 2. Go to create
    // 3. Fill recognizable customer (uniqueTlCustomer)
    // 4. Submit
    // 5. Land on list with new row
  });
});
```

Prefer clear step comments over clever helpers that hide the story. Item 6 adds
only `uniqueTlCustomer` — the journey steps stay inline and obvious.

---

## Avoiding excessive assertions

Assert **outcomes**, not every intermediate pixel.

Enough for Item 4:

- After submit: back on `/invoices` (URL and/or heading)
- New customer string visible in a table row

Too much (belongs in RTL or nowhere):

- Every label still present on the form mid-fill
- Exact currency formatting string (unit-tested already)
- Skeleton class names during load (unless Item 5 explicitly targets loading)
- Cancel button still rendered after successful navigate

---

## Recognizable test data (`tl_` + time suffix)

Use a clearly identifiable customer value so re-runs and parallel workers stay
unique (`tests/e2e/helpers/unique-tl-customer.ts`):

```ts
const customer = uniqueTlCustomer("create"); // tl_pw_create_<time>_<random>
```

Why:

- Easy to spot in the UI and in the database (`tl_pw_` prefix)
- Distinguishes lab/E2E rows from seed data
- Avoids ambiguous `getByText` matches when the same fixed name is created twice
- Isolation helper owned by Item 6 (`tl_pw_create_<unique>`, `tl_pw_error_<unique>`)

---

## App-shaped note (this lab)

Overview step “confirm the form closes” maps to **navigate back to `/invoices`**
after a successful `createInvoiceAction` (`CreateInvoiceView` pushes the list).
There is no modal to dismiss — assert list URL/heading + new row instead of
“dialog closed.”

---

## What this journey proves (and what it does not)

**Proves:**

- List → create link → `/invoices/new` routing
- Form fill + submit in a real browser
- Server action + persistence path succeeds for valid input
- Return to list and new invoice is visible

**Does not prove (keep in Jest / later items):**

- Every validation message (RTL)
- Mutation insert shape with mocked Supabase (unit)
- Loading button disabled state (Item 5 if needed)
- Edit / delete (not built)
- Network failure UI via `page.route` (Item 5 hook; named **controlled** in [`2-7-playwright-network-testing.md`](./2-7-playwright-network-testing.md))

---

## In this project

| Piece | Value |
|---|---|
| Spec | `tests/e2e/create-invoice.spec.ts` |
| Marker customer | `uniqueTlCustomer("create")` → `tl_pw_create_<time>_<random>` |
| Locators | Link “Create invoice” → labels → button “Create invoice” → row with customer |
| Outcome | URL `/invoices` + row visible |
| Smoke (separate) | `tests/e2e/invoices.spec.ts` — still page-load only |
| Backend | Real Next + Supabase for success path; Item 5 adds narrow `page.route` delay/abort for loading/error only |
| RLS prerequisite | `supabase/migrations/0002_tl_invoices_public_insert.sql` — Phase 0 only had SELECT |
| Not in scope | Validation (RTL), edit/delete, teardown janitor; real vs controlled named in [`2-7-playwright-network-testing.md`](./2-7-playwright-network-testing.md) |

### RLS note

Phase 0 migration enabled RLS with **public SELECT only**. Create Invoice and this
E2E need an **INSERT** policy for `anon` / `authenticated`. Apply
`0002_tl_invoices_public_insert.sql` in the Supabase SQL editor (or `supabase db
push`) before expecting the journey to pass. Without it, submit stays on
`/invoices/new` with a persistence alert (RLS violation).

### How to run

```bash
npm run test:e2e                          # smoke + journey
npm run test:e2e -- tests/e2e/create-invoice.spec.ts
npm run test:e2e:headed                   # watch once
```

---

## Key Insight

Protect the outcome users care about: *I created an invoice and I can see it.*

Write the test so a human can follow it. Leave component contracts to Phase 1.
