# Testing Inventory

> Phase 1 · Item 8 · Decision table (map, buckets, uncovered review, holes).
>
> Concepts live in [`1-8-testing-strategy.md`](./1-8-testing-strategy.md).
>
> Combined Jest / RTL / Playwright map:
> [`2-8-playwright-debugging-and-strategy.md`](./2-8-playwright-debugging-and-strategy.md).
>
> **Coverage is a measurement. Confidence is the goal.**
> Use this doc to decide what is worth protecting — not to chase a percentage.

Baseline when this inventory was drafted: **10 suites / 41 tests**,
`npm run test:coverage` ≈ **74% statements** on FSD layers in `collectCoverageFrom`
(`entities/`, `features/`, `views/`, `widgets/`, `shared/`; barrels and `*.d.ts`
excluded; `app/` and most `components/ui` out by design).

---

## 1. Map of product areas / existing behaviors

| Area | Behaviors | Example paths |
|---|---|---|
| **List invoices** | Load list; show rows; empty state; loading skeleton; query failure → route error + retry | `InvoicesSection`, `InvoicesTable`, `InvoicesTableSkeleton`, `listInvoices`, `app/invoices/error.tsx` |
| **Create invoice** | Fill form; validate; submit; cancel; persist; success navigate; action failure alert | `CreateInvoiceForm`, `CreateInvoiceView`, `createInvoiceAction`, `createInvoice` |
| **Domain helpers** | Currency display; status labels; DB row → domain `Invoice` | `formatCurrency`, `formatInvoiceStatus`, `toInvoice` |
| **Home / chrome** | Landing cards; theme; layout shell | `views/home/*`, theme switcher, root layout |
| **Infra** | Supabase server client; Jest setup; fixtures | `lib/supabase/server`, `tests/setupTests.ts`, `tests/fixtures/*` |
| **Design system** | Shared primitives | `components/ui/*` |
| **Route shells** | Thin Next route files that compose views | `app/invoices/page.tsx`, `loading.tsx`, `app/invoices/new/page.tsx` |

---

## 2. Inventory — Should / Nice / Doesn't need

For every area: bucket + one-line why. “Already covered” means Items 3–7 protect it today.

### Should be tested

| Surface | Why | Status |
|---|---|---|
| `formatCurrency` / `formatInvoiceStatus` | Easy to get wrong; stable display contract | Covered (Item 3) |
| `InvoicesTable` headers, rows, empty | Core list UX users see | Covered (Item 4) |
| `CreateInvoiceForm` typing, submit payload, validation, cancel, keyboard | Core create UX + client validation | Covered (Item 5) |
| List loading status (`InvoicesTableSkeleton`) | Accessible async waiting state | Covered (Item 6) |
| `InvoicesSection` success / empty / reject | Async list outcomes without hitting DB | Covered (Item 6) |
| `/invoices` `error.tsx` + retry | User-visible failure recovery | Covered (Item 6) |
| `createInvoice` mutation (mocked Supabase) | Write contract: snake_case insert + domain return + throw | Covered (Item 7) |
| `CreateInvoiceView` wiring (mocked action + router) | Submit → persist boundary → navigate / alert | Covered (Item 7) |

### Nice to test

| Surface | Why | Status |
|---|---|---|
| `toInvoice` unknown-status → `"draft"` fallback | Defensive branch; only half covered via happy-path rows | Optional — branch gap only |
| `InvoicesPageHeader` / “Create invoice” link | Cheap navigation chrome; not business logic | Uncovered — skip unless link regressions become painful |
| `createInvoiceAction` thin map | Almost fully implied by mutation + view wiring tests | 0% because view mocks it — OK |
| `CreateInvoiceView` cancel → `router.push` | Form cancel is covered; view cancel is a one-liner | Uncovered line — low priority |
| Home card copy | Only if home becomes product-critical | Uncovered — out of invoice focus |
| Empty-customer avatar `"?"` in table | Tiny edge of `initial()` | Uncovered branch — low priority |

### Doesn't need testing (at unit level)

| Surface | Why |
|---|---|
| Thin `app/**/page.tsx` / `loading.tsx` | Composition shells only |
| Barrel `index.ts` / `server.ts` re-exports | No behavior; excluded or noise |
| `components/ui/*` (shadcn) | Third-party / generated UI |
| Type-only modules (`NewInvoiceInput`, model types) | Compile-time only |
| Full Next streaming / middleware | Wrong layer — later integration/E2E |
| Re-testing formatters through every consumer | Already protected at helper + table/form contracts |

---

## 3. Uncovered files — intentional review

From `npm run test:coverage` (in-scope FSD files). Classify each; decide add / document skip / defer.

| File | Coverage signal | Classify | Decision |
|---|---|---|---|
| `entities/invoice/queries/list-invoices.ts` | 0% | **Should** behavior, covered at section boundary | **Document skip** — Item 6 mocks the module; real query never runs in unit tests |
| `features/create-invoice/server/create-invoice-action.ts` | 0% | **Nice** (thin map) | **Document skip** — view mocks action; mutation tests own persistence |
| `views/home/lib/home-cards.ts` | 0% | **Doesn't need** | **Document skip** — not invoice-critical |
| `views/home/ui/page-cards.tsx` | 0% | **Doesn't need** | **Document skip** |
| `views/invoices/server.ts` | 0% | **Doesn't need** | **Document skip** — re-export surface |
| `views/invoices/ui/invoices-page-header.tsx` | 0% | **Nice** | **Defer** — add only if header/link regressions show up |
| `entities/invoice/transform/to-invoice.ts` | 100% lines / **50% branches** (line 30 fallback) | **Nice** | **Defer** — unknown status → `"draft"` not arranged yet |
| `views/invoices/ui/create-invoice-view.tsx` | ~94%; line 38 cancel push | **Nice** | **Defer** — form cancel covered; view cancel is wiring |
| `views/invoices/ui/invoices-table.tsx` | 100% lines / **75% branches** (line 58 `"?"`) | **Nice** | **Defer** — empty-name avatar edge |

Fully covered invoice-critical files (`create-invoice.ts`, form, section, skeleton, formatters, etc.) need no decision beyond “keep protecting.”

---

## 4. Real confidence holes

A **real confidence hole** = important behavior with **no** test that would fail if it broke.

### Not holes (0% is expected)

- **`listInvoices`** — list success/empty/reject asserted via `InvoicesSection` with a mock.
- **`createInvoiceAction`** — create success/error asserted via `CreateInvoiceView` + mutation unit tests.
- **Home / barrels / design system / route shells** — intentionally out of unit focus.

### Soft gaps (optional polish — not blocking Item 8)

1. **`toInvoice` unknown status → `"draft"`** — defensive mapping never arranged.
2. **`CreateInvoiceView` cancel navigation** — form-level cancel covered; router push on cancel not asserted in the view test.
3. **Non-`Error` reject message fallback** in the view catch (if that branch exists).
4. **Empty customer → `"?"` avatar** — trivial UI edge.

### Verdict for Item 8 step 6

**No mandatory new tests.** Core list + create behaviors are protected. Soft gaps may stay documented; add a minimal test only if you want extra branch confidence.

---

## Key reminder

Coverage answers: *“Did a test touch this code?”*  
Confidence answers: *“Would a broken important behavior fail a test?”*

Prefer documenting an intentional skip over a low-value test that only raises a
percentage. Future-feature checklist: [`1-8-testing-strategy.md`](./1-8-testing-strategy.md).
