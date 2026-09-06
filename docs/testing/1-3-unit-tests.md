# Basic Unit Tests

> Phase 1 · Item 3.

Our first **real** tests: not infrastructure checks, but business-facing
formatting logic extracted from the invoice UI. We start with **pure utility
functions** because they are the cheapest, fastest, most stable tests to write.

---

## Pure functions

A **pure function** always returns the same output for the same input and has **no
side effects** — it does not:

- read or write global state,
- call APIs or touch the database,
- mutate its arguments,
- depend on `Date.now()`, randomness, or environment unless you pass those in.

```ts
// Pure — output depends only on `amount`.
function formatCurrency(amount: number): string { … }

// Not pure — reads "now" internally; result changes every millisecond.
function formatRelativeDate(iso: string): string {
  return formatDistanceToNow(new Date(iso));
}
```

Pure functions are ideal first tests: call in, assert out, done.

## Deterministic functions

A function is **deterministic** when repeated calls with the same arguments always
produce the same result. Pure functions are deterministic; some impure functions
can be deterministic too (e.g. reading a constant config file at module load).

For tests we care about determinism because
**`expect(formatCurrency(1200)).toBe("$1,200.00")` must never flake**. If a test
sometimes passes and sometimes fails with identical inputs, the function under
test (or the test itself) is non-deterministic.

Formatting helpers we own should be deterministic. When we wrap `Intl.NumberFormat`,
we fix locale/currency in the helper so tests don't depend on the runner's
environment.

## Why utilities are the easiest to test

| Property | Utility (pure fn) | React component |
|---|---|---|
| Setup | none — import and call | `render()`, providers, mocks |
| Speed | microseconds | milliseconds+ |
| Coupling | zero DOM / React | jsdom, RTL queries |
| Refactor survival | high — tests the contract | depends on query choice |
| Failure signal | wrong input → output mapping | many moving parts |

Utilities sit at the **base of the testing pyramid** (Item 1): many fast tests,
high confidence per line of test code. They also **document business rules** in
executable form — "unknown status becomes Draft" is clearer in a test than in a
comment.

## Examples from this repo

**Currency display** — extracted from `InvoicesTable` into
`shared/lib/formatCurrency`. The table imports the helper; tests assert the
helper's contract.

**Status display** — `entities/invoice/lib/formatInvoiceStatus` owns labels:
known statuses → title-case text, unknown/empty → `"Draft"` (same spirit as
`toInvoiceStatus` in the entity transform layer).

### Out of Item 3 scope (but pure)

- `toInvoice(row)` — maps a DB row to domain `Invoice`.
- `initial(customer)` — first letter of customer name (tiny, UI-coupled).

### Not unit-test targets (without mocks)

- `listInvoices()` — hits Supabase (integration/mock territory, Items 6–7).
- `InvoicesSection` — async server component (not RTL-renderable).
- `InvoicesTable` empty/populated branches — component tests (Item 4).

Generic helpers live in `shared/lib/`; invoice-specific helpers in
`entities/invoice/lib/` (not a root `utils/` dump).

---

## Edge cases we locked in

**`formatCurrency`**

| Input | Expected |
|---|---|
| `1200` | `"$1,200.00"` |
| `0` | `"$0.00"` |
| `19.99` | `"$19.99"` |
| `-50` | `"-$50.00"` (negatives allowed) |
| `1000000` | `"$1,000,000.00"` |

**`formatInvoiceStatus`**

| Input | Expected |
|---|---|
| `"draft"` / `"pending"` / `"paid"` / `"overdue"` | title-case label |
| `"unknown"` | `"Draft"` |
| `""` | `"Draft"` |

---

## In this project

### Files

| Role | Path |
|---|---|
| Currency helper | `shared/lib/format-currency.ts` (+ `shared/lib/index.ts`) |
| Status helper | `entities/invoice/lib/format-invoice-status.ts` (+ `lib/index.ts`) |
| Consumer | `views/invoices/ui/invoices-table.tsx` |
| Currency tests | `tests/unit/shared/lib/format-currency.test.ts` |
| Status tests | `tests/unit/entities/invoice/lib/format-invoice-status.test.ts` |

### Test comment convention

Each unit test file:

- opens with a `@file` header,
- comments Jest primitives the first time they appear (`describe`, `it` /
  `it.each`, `expect`, `.toBe`),
- then comments only the *business why* on edge cases.

### Verification

```bash
npm test
# 3 suites, 13 tests (sanity + formatCurrency + formatInvoiceStatus)

npm run test:coverage
# format-currency.ts and format-invoice-status.ts at 100% statements/lines
```

---

## Key insight

**Business logic changes less frequently than UI.**

Extract formatting and domain rules into pure functions and test them first. When
the table's markup or Tailwind classes change (Item 4 territory), currency and
status rules stay green as long as the helper contracts hold.

If someone changes how overdue invoices display, `format-invoice-status.test.ts`
fails first — not a component test. That separation is the point.
