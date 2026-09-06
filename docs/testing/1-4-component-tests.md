# Component Rendering Tests

> Phase 1 · Item 4.

Item 4 moves from **pure functions** (Item 3) to **components**: we render UI into
jsdom and assert on what appears on screen. Still no user clicks or async fetching —
just "given these props, does the user see the right thing?"

Target component: `views/invoices/ui/invoices-table.tsx` — a pure, presentational
table that receives `invoices: Invoice[]` and renders either rows or an empty state.

---

## `render()`

From `@testing-library/react`:

```tsx
import { render } from "@testing-library/react";
import { InvoicesTable } from "@/views/invoices/ui/invoices-table";

render(<InvoicesTable invoices={[]} />);
```

`render()` mounts the component into jsdom (provided by Jest's `jsdom` environment).
It returns utilities (`container`, `rerender`, `unmount`), but **prefer querying via
`screen`** rather than digging into `container` — `screen` searches the whole document
the way a user experiences it.

`render()` is synchronous for our table — no Suspense, no async server component.
(`InvoicesSection` is async and server-only; we test the dumb child with props instead.)

---

## `screen`

A pre-bound query object that searches `document.body`:

```tsx
import { screen } from "@testing-library/react";

screen.getByText("No invoices yet");
screen.getByRole("table");
```

Always import queries from `screen` (or destructure from `render()` result only when
scoping to a subtree). Global `screen` keeps tests readable and matches how users
see one page at a time.

---

## Query types: getBy, queryBy, findBy

All three family names share suffixes (`Role`, `Text`, `LabelText`, …). The **prefix**
changes behavior:

| Prefix | Returns when missing | Async? | Use when |
|---|---|---|---|
| **`getBy*`** | **throws** | no | element **must** exist (default choice) |
| **`queryBy*`** | **`null`** | no | asserting element is **absent** |
| **`findBy*`** | throws (after timeout) | **yes** | element appears **after** async work |

Examples for our table:

```tsx
// Populated — table must exist.
screen.getByRole("table");

// Empty — table must NOT exist; queryBy returns null instead of throwing.
expect(screen.queryByRole("table")).not.toBeInTheDocument();

// Async (Item 6) — wait for data to appear.
await screen.findByText("Acme Corp");
```

**Rule of thumb:** start with `getByRole`. Use `queryBy` only when checking absence.
Use `findBy` when something loads asynchronously (not needed for Item 4).

Variants: `getAllByRole("row")` returns an array when multiple matches are expected.

---

## Accessibility queries (priority order)

RTL recommends querying in this order — each step is more tied to implementation:

1. **`getByRole`** — buttons, links, headings, table, row, columnheader…
2. **`getByLabelText`** — form fields with associated labels
3. **`getByPlaceholderText`** — when no label (fallback)
4. **`getByText`** — visible text content
5. **`getByDisplayValue`** — current input value
6. **`getByAltText`** — images
7. **`getByTitle`** — title attribute
8. **`getByTestId`** — last resort (`data-testid`)

For `InvoicesTable`, **`getByRole`** and **`getByText`** cover almost everything:

```tsx
screen.getByRole("columnheader", { name: "Customer" });
screen.getByText("Acme Corp");
screen.getByText("No invoices yet");
```

**How role + name are known:** a `<th scope="col">Customer</th>` maps to ARIA role
`columnheader`; the accessible name is the cell's text content (`"Customer"`).

---

## Why roles matter

ARIA **roles** reflect how assistive tech exposes the page. When you write:

```tsx
screen.getByRole("table")
screen.getByRole("columnheader", { name: "Status" })
```

you're testing the same structure a screen reader user navigates — not an internal
class name or `data-testid` you invented. That gives you:

- **Behavior-focused tests** — survives CSS/markup refactors if semantics stay.
- **Free accessibility feedback** — if `getByRole("table")` fails, the table may
  lack proper semantics.
- **Stable selectors** — "Customer" column header text is a user-visible contract.

Our table already uses semantic markup: `<table>`, `<th scope="col">`, sr-only
`<caption>`. Tests should lean on that.

---

## Tradeoffs

| Approach | Pros | Cons |
|---|---|---|
| **`getByRole` / `getByText`** | User-realistic, a11y-aligned, refactor-resistant | Verbose names; must learn role API |
| **`getByTestId`** | Easy to target anything | Not how users find things; encourages bad markup |
| **Snapshot tests** | Fast to write | Huge diffs, brittle, low confidence — **avoid in Item 4** |
| **Testing full page** | Highest integration confidence | Needs mocks for server/data; slower — save for later |
| **Testing component with props** | Fast, isolated, no mocks | Doesn't catch wiring bugs in parent |

Item 4 chooses **isolated component + props** — the sweet spot after unit tests.

---

## Mapping phase doc → `InvoicesTable`

The phase doc says verify "heading exists, invoices render, empty state renders."

| Phase requirement | What we test on `InvoicesTable` |
|---|---|
| **Heading exists** | Column headers (`Customer`, `Status`, `Amount`, `Due date`) via `getByRole("columnheader")`. The page `<h1>Invoices</h1>` lives in `app/invoices/page.tsx` — **out of scope** for this isolated component test. |
| **Invoices render** | Customer names, formatted amounts, status labels appear for fixture data. |
| **Empty state renders** | `"No invoices yet"` visible; table absent. |

Formatting rules (`formatCurrency`, `formatInvoiceStatus`) are covered in Item 3 — Item 4
only checks they **show up in the DOM** (integration smoke), not every edge case.

---

## In this project

### Files

| Role | Path |
|---|---|
| Component under test | `views/invoices/ui/invoices-table.tsx` |
| Fixture data | `tests/fixtures/invoices.ts` (`mockInvoice`, `mockInvoices`) |
| Component tests | `tests/unit/views/invoices/ui/invoices-table.test.tsx` |

### Query choices per behavior

| Behavior | Queries |
|---|---|
| Empty state | `getByText("No invoices yet")`, `getByText(/Seed the tl_invoices table/)`, `queryByRole("table")` + `.not.toBeInTheDocument()` |
| Populated rows | `getByRole("table")`, `getByText` for customers / `$1,200.00` / `$499.50` / Paid / Pending, `getAllByRole("row")` |
| Column headers | `getByRole("columnheader", { name: "…" })` for Customer, Status, Amount, Due date |

### Test comment convention

The component test file:

- opens with a `@file` header listing RTL primitives used,
- comments the first use of `render`, `getByRole` / `getByText` / `queryByRole` /
  `getAllByRole`, and `.toBeInTheDocument()`,
- notes that phase-doc "heading" means column headers (page `<h1>` out of scope),
- does **not** use `toMatchSnapshot()`.

### Out of scope

- Page-level `<h1>Invoices</h1>` in `app/invoices/page.tsx`
- Clicks / forms → Item 5
- Async `findBy` / `waitFor` → Item 6
- Supabase mocks → Item 7

### Verification

```bash
npm test
# 4 suites, 22 tests (sanity + helpers + InvoicesTable)

npm test -- tests/unit/views/invoices/ui/invoices-table.test.tsx
# single-file run

npm run test:coverage
# invoices-table.tsx shows >0% statement coverage
```

---

## Key insight

**Users don't know your component tree. They only know what appears on screen.**

Item 4 tests are written from that perspective: query what a user (or screen reader)
would find, not how React structured the vnode tree.

After Item 4 you should answer: _"If I rename an internal CSS class on the status
pill, do my tests still pass?"_ → Yes, if you queried by role/text. _"If I remove the
'No invoices yet' message, do they fail?"_ → Yes. That's behavior testing.
