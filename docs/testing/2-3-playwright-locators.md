# Playwright Locators and Selectors

> Phase 2 · Item 3 · Concepts + project wiring.
>
> Builds on [`2-2-playwright-setup.md`](./2-2-playwright-setup.md) and
> [`2-1-e2e-mental-model.md`](./2-1-e2e-mental-model.md).
>
> Next: assertions and auto-waiting — Item 5
> ([`2-5-playwright-waiting.md`](./2-5-playwright-waiting.md)).

Item 2 proved Playwright can open `/invoices`. Item 3 is about **how** tests find
elements in that browser — and why that choice decides whether tests survive
redesigns.

> A good E2E selector describes what the user interacts with, not how the element
> is implemented.

---

## Locators vs CSS selectors

A **locator** in Playwright is a handle that finds element(s) on the page and
retries until they are ready for an action or assertion.

You can build locators many ways. Prefer **user-facing** queries; treat raw CSS
as a last resort.

| Approach | Example | Stability |
|---|---|---|
| Role + name | `page.getByRole("button", { name: "Create invoice" })` | High — matches how users / AT see it |
| Label | `page.getByLabel("Customer")` | High — form fields users fill |
| Text | `page.getByText("No invoices yet")` | Medium — copy changes break it |
| Placeholder | `page.getByPlaceholder("Search…")` | Medium — placeholders often change |
| Test id | `page.getByTestId("invoice-row")` | Medium — intentional test hook |
| CSS / nth | `page.locator(".btn-primary:nth-child(2)")` | Low — tied to layout/classes |

---

## `getByRole`

Finds by [ARIA role](https://www.w3.org/TR/wai-aria/#role_definitions) and
optional accessible name.

```ts
page.getByRole("heading", { name: "Invoices" });
page.getByRole("button", { name: "Create invoice" });
page.getByRole("table");
page.getByRole("link", { name: "Back to invoices" });
```

Roles come from semantics: `<h1>` → heading, `<button>` / button-styled control →
button, `<a href>` → link, `<table>` → table, `role="alert"` → alert.

**Accessible name** usually comes from visible text, `<label>`, `aria-label`, or
`aria-labelledby`. If the name is wrong or missing, both users of assistive tech
and your tests suffer.

---

## `getByLabel`

Finds form controls by their associated label text.

```ts
page.getByLabel("Customer");
page.getByLabel("Amount");
page.getByLabel("Status");
page.getByLabel("Due date");
```

This matches how sighted users and screen-reader users identify fields. It
requires a real association (`<label htmlFor="…">` + matching `id`, or wrapping
label). Phase 1’s `CreateInvoiceForm` already wires labels this way — reuse that,
do not invent `data-testid`s for every field.

---

## `getByText`

Finds by visible text content.

```ts
page.getByText("No invoices yet");
page.getByText("tl_playwright_create_invoice"); // later journeys
```

Good for empty states, confirmations, and unique customer strings. Fragile if
marketing copy churns often — prefer role+name when both work.

---

## `getByPlaceholder`

Finds inputs by placeholder string.

Useful when there is no label (bad a11y) or the placeholder is the only stable
hint. Prefer fixing the label over depending on placeholder long-term.

---

## `getByTestId`

Finds by `data-testid="…"`.

```ts
page.getByTestId("invoices-empty");
```

**Use only when semantic selectors genuinely do not fit** — e.g. an icon-only
control with no accessible name you can fix, or a dynamic chart with no role.
Every `data-testid` is a test-only API you must maintain. Prefer improving
accessibility first.

---

## CSS selectors and why they are fragile

```ts
page.locator(".btn-primary:nth-child(2)");
```

This couples the test to:

- class names (`btn-primary` may become `bg-primary` in a redesign)
- DOM order (`nth-child(2)` breaks when a new button is inserted)
- layout structure that users never see

Compare:

```ts
page.getByRole("button", { name: "Create invoice" });
```

The second still works if the button moves, changes color, or loses the
`btn-primary` class — as long as it remains a button named “Create invoice”.

---

## Locator chaining

Narrow a search by combining locators:

```ts
const form = page.getByRole("form"); // if the form has a name / is findable
await form.getByLabel("Customer").fill("…");

const row = page.getByRole("row").filter({ hasText: "tl_playwright_create_invoice" });
await expect(row).toBeVisible();
```

Chaining keeps scopes local (this form, this row) without CSS paths. Prefer
`filter({ hasText })` / `getByRole` inside a section over `div > div > span`.

---

## Why semantic selectors are preferred

1. **Survive redesigns** — styling and structure change; roles and names often stay.
2. **Match user intent** — “click Create invoice” is the product story.
3. **Force better a11y** — if Playwright cannot find it by role/label, real users
   may also struggle.
4. **Same philosophy as RTL** — Phase 1 already taught `getByRole` / `getByLabelText`.

---

## How accessibility improves testability

| UI practice | Test benefit |
|---|---|
| Real `<h1>` for page title | `getByRole("heading", { name: "…" })` |
| `<label htmlFor>` on fields | `getByLabel("Customer")` |
| Visible button/link text | `getByRole("button" \| "link", { name: "…" })` |
| `role="alert"` on errors | `getByRole("alert")` |
| Table with `<th>` headers | Column headers via role / name |

Inspect the invoice UI and fix gaps so semantic locators work. Do not paper over
missing labels with CSS or test ids.

---

## Playwright locators vs RTL queries

| | **RTL (Phase 1)** | **Playwright (Phase 2)** |
|---|---|---|
| Environment | jsdom, mounted tree | Real page in browser |
| Queries | `screen.getByRole`, `getByLabelText`, … | `page.getByRole`, `getByLabel`, … |
| Philosophy | Prefer accessible queries | Same preference |
| Names | `getByLabelText` | `getByLabel` (shorter name, same idea) |
| Absence | `queryBy*` | `expect(locator).toHaveCount(0)` / not visible |
| Async appear | `findBy*` | Auto-wait on locator actions/assertions |

Learning transfer: if you can write a stable RTL query, you can usually write the
matching Playwright locator. The difference is scope (component vs full app) and
waiting (Item 5 deepens auto-waiting).

---

## Fragile vs stable — invoice examples

**Fragile (avoid):**

```ts
await page.locator("header a.inline-flex").click();
await page.locator("input[type=text]").nth(0).fill("Acme");
await page.locator(".rounded-xl.border table tbody tr").first().click();
```

**Stable (prefer):**

```ts
await page.getByRole("link", { name: "Create invoice" }).click();
await page.getByLabel("Customer").fill("Acme");
await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
await expect(page.getByText("No invoices yet").or(page.getByRole("table"))).toBeVisible();
```

Note: the list header’s “Create invoice” is a **Link** styled as a button
(`Button asChild` + `Link`). Prefer `getByRole("link", { name: "Create invoice" })`,
not a CSS class on the Button. The form submit control is a separate **button**
also named “Create invoice.”

---

## When `data-testid` is acceptable

Use it when:

- You already improved a11y and still cannot target uniquely
- The control is purely visual with no meaningful name (rare — usually fix a11y)
- You need a stable hook across copy that intentionally varies

Do **not** add test ids to every field “just in case.” Customer / Amount / Status /
Due date already have labels.

---

## Verification mindset

> Change harmless styling or CSS classes. The test should still pass.

That is the definition of a semantic suite: visual refactors do not break E2E
unless the **user-facing contract** (roles, names, copy you asserted) changed.

---

## In this project

Exact wiring for this lab (Item 3):

| Piece | Value |
|---|---|
| Spec | `tests/e2e/invoices.spec.ts` — list smoke + create-page locator sanity |
| Preferred APIs | `getByRole`, `getByLabel`, `getByText` (+ `locator.or`) |
| Avoid | CSS, nth-child, class-tied locators |
| `data-testid` | Unused — Phase 1 labels/roles were enough (no a11y UI changes) |
| Create control (list) | Link named “Create invoice” (`InvoicesPageHeader`) |
| Form fields | Labeled Customer / Amount / Status / Due date (`CreateInvoiceForm`) |
| Create-page check | Heading + `getByLabel("Customer")` / `Amount` visible — no fill/submit |

### What we verified

1. Inspected list header, table/empty, create view, and form — semantic hooks already present.
2. No product a11y fixes required for Item 3.
3. Smoke asserts heading, Create invoice **link**, and table-or-empty via text/role.
4. Optional create-page locator test proves `getByLabel` without becoming a journey.

### How to run

```bash
npm run test:e2e
```

If Chromium is missing from the user cache, see
[`2-2-playwright-setup.md`](./2-2-playwright-setup.md) (browser binaries note).

---

## Key Insight

Stable selectors make tests survive redesigns.

Describe the control the way a user would: “the Create invoice link,” “the
Customer field,” “the Invoices heading” — not “the second primary button in the
header flex.”
