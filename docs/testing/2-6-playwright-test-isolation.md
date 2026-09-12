# Playwright Fixtures and Test Isolation

> Phase 2 · Item 6 · Concepts + project wiring.
>
> Builds on [`2-4-e2e-user-journeys.md`](./2-4-e2e-user-journeys.md) and
> [`2-5-playwright-waiting.md`](./2-5-playwright-waiting.md).
>
> Next: network mocking — Item 7.

Item 4–5 journeys hit a **shared** Supabase table. Item 6 is about making each
E2E test **own its state** so order, parallelism, and re-runs do not create
flakes.

The phase goal:

> Every E2E test should own the state it depends on.

---

## Test isolation

**Isolation** means: test A’s pass/fail does not depend on whether test B ran,
in what order, or what leftover rows exist from yesterday’s run.

Opposite (dangerous):

```text
Test 2 assumes Test 1 created an invoice.
```

If Test 1 is skipped, renamed, or fails early, Test 2 fails for the wrong reason.
CI parallel workers make this worse: B may run before A.

---

## Why tests should not depend on execution order

Playwright (and CI) may run files/workers in parallel (`fullyParallel`). Order is
not a contract. Each test must:

1. **Arrange** the data it needs (or accept empty/list-any chrome intentionally)
2. **Act** through the browser
3. **Assert** on outcomes tied to *its* marker data
4. **Clean up** when practical (so the DB does not fill with junk forever)

Smoke tests that only need “page loads” are already isolated. Create journeys that
insert rows are not — unless each uses unique data and does not assume a prior row.

---

## `beforeEach` / `beforeAll`

| Hook | Use |
|---|---|
| `beforeEach` | Fresh setup per test (preferred for isolation) |
| `beforeAll` | Expensive shared setup once per file — risk if it mutates shared DB state other tests assume |

Prefer `beforeEach` (or per-test inline setup) for anything that writes to
`tl_invoices`. This lab uses per-test `uniqueTlCustomer(...)` — same idea, no
shared `beforeAll` seed.

---

## Playwright fixtures

Playwright **fixtures** are injectable test parameters (`page`, `context`, …) and
custom ones you define (e.g. `uniqueCustomer`, `createInvoiceViaUi`).

```ts
// Built-in: each test gets an isolated browser context + page by default.
test("…", async ({ page }) => { … });
```

Custom fixtures help when setup repeats — keep them **small**. This item uses a
plain helper, not a fixture framework.

---

## Browser context isolation

By default each test gets a **new context** (cookies/storage isolated). That does
**not** isolate the **database**. Two tests can still collide on the same
customer name or shared row if they both write to Supabase.

Browser isolation ≠ data isolation.

---

## Test data isolation (`tl_` convention)

Continue the Testing Lab prefix; make values unique per run/test:

```text
tl_pw_create_<unique>
tl_pw_error_<unique>
tl_pw_edit_<unique>    // when edit exists
tl_pw_delete_<unique>  // when delete exists
```

```ts
import { uniqueTlCustomer } from "./helpers/unique-tl-customer";

const customer = uniqueTlCustomer("create"); // tl_pw_create_<time>_<random>
```

`Date.now()` keeps names readable; the random suffix avoids two workers starting
in the same millisecond. Prefer uniqueness even when cleanup is best-effort.

---

## Setup, teardown, database state

**Setup** — create the row the test needs (via UI journey, or a small helper that
still leaves the *assertion path* user-facing when testing a journey).

**Teardown** — delete `tl_pw_*` rows the test created when practical (API helper,
admin client, or UI delete when product supports it).

**Shared seed data** (Acme, Globex, …) — do not depend on a specific seed row for
assertions if another test might delete or rename it. Prefer markers you create.

---

## Shared test accounts

When auth exists, shared “e2e@…” users are common — and risky if tests mutate the
same account’s data. This lab has **no auth UI** yet; isolation focus is **table
rows**, not accounts.

---

## Parallel tests

`fullyParallel: true` (current config) means overlapping creates. Unique customer
strings (time + random) prevent “which row?” ambiguity.

If two tests assert `getByText("tl_pw_create")` with a **fixed** name, parallel
runs flake: locators match more than one row, or a unique constraint fails.

---

## Why mutable shared data causes flakes

| Shared mutable thing | Failure mode |
|---|---|
| Fixed customer name | Ambiguous locators; unique constraint errors |
| “First row in table” | Order/seed changes |
| “Whatever Test 1 left behind” | Skip/reorder breaks Test 2 |
| Uncleared `tl_*` growth | Slower lists; harder debugging |

---

## When edit/delete exist

Phase overview Build asks for Edit Invoice and Delete Invoice journeys. **Those
product features are not built** (Item 1: not worth inventing for demos).

Item 6 therefore:

- Teaches isolation on **existing** create (+ Item 5 loading/error) flows
- Introduces `uniqueTlCustomer` — cleanup deferred
- Does **not** invent edit/delete UI solely for Playwright

When edit/delete ship later:

- Seed `tl_pw_edit_<unique>` / `tl_pw_delete_<unique>` **inside that test**
- Never assume another test created the target row
- Clean up when practical (product delete or a real admin path)

---

## In this project

| Piece | Value |
|---|---|
| Helper | `tests/e2e/helpers/unique-tl-customer.ts` — `uniqueTlCustomer("create" \| "error")` |
| Specs using it | `tests/e2e/create-invoice.spec.ts` (success + error) |
| Prefix | `tl_pw_<kind>_<time>_<random>` |
| Smoke / locators | `tests/e2e/invoices.spec.ts` — no writes; already isolated |
| Assertions | Success filters `getByRole("row")` by **that** customer; error asserts `toHaveValue(customer)` |
| Cleanup | **Deferred** — no delete feature, no DELETE RLS, no service-role key |
| `beforeAll` seed | None — each write-path test calls the helper itself |
| Custom Playwright fixture | Not added — one function is enough |
| Edit / delete E2E | Not invented; pattern above when product exists |

### Why teardown was skipped

`.env.example` only has the publishable/anon key. RLS allows public **SELECT**
and **INSERT**, not **DELETE**. A janitor would need a service-role secret or a
public delete policy — new infra for leftover lab rows. Unique names are the
isolation.

### How to run

```bash
npx playwright test tests/e2e/create-invoice.spec.ts
npm run test:e2e
```

Oral check: two parallel create tests flake on a **fixed** customer name because
both rows (or neither uniquely) match `getByText` / `hasText`.

---

## Key Insight

Test isolation becomes increasingly important as suites grow and CI runs tests
in parallel.

Own your data. Assume nothing about order.
