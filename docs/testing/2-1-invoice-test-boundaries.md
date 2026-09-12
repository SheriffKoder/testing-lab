# Invoice Test Boundaries

> Phase 2 · Item 1 · Decision table (Jest+RTL / Playwright / Both / Not worth).
>
> Concepts live in [`2-1-e2e-mental-model.md`](./2-1-e2e-mental-model.md).
>
> Unit-level Should / Nice / Doesn't need:
> [`1-8-testing-inventory.md`](./1-8-testing-inventory.md).
>
> **Choose the smallest layer that still gives meaningful confidence.**
> Do not install Playwright here — this doc only classifies *where* confidence
> should live.

Product today: **list invoices** (`/invoices`) and **create invoice**
(`/invoices/new`). Edit / delete are not built.

This table answers a different question than Phase 1’s inventory:

| Phase 1 inventory | This doc |
|---|---|
| Should / Nice / Doesn't need *unit* coverage? | Jest+RTL, Playwright, Both, or Not worth? |

---

## How to read the buckets

**Jest + RTL** — Isolation is enough. Pure helpers, component contracts,
interactions, and mocked wiring. Already covered in Phase 1 unless noted.

**Playwright** — Confidence needs a real browser (and usually real routing /
server / data). Specs land in Phase 2+; listed here so we do not skip journeys
or invent the wrong ones.

**Both** — Cheap RTL depth *and* a thin E2E journey. RTL owns details;
Playwright owns “the workflow still works end-to-end.” Do not duplicate every
RTL assertion in the browser.

**Not worth** — Wrong layer, not built, or already owned cheaper. Skip at E2E
(and usually do not add more unit tests either).

---

## Jest + RTL

Unit / component / interaction / mocked wiring is enough. Prefer these over
browser tests for the same behavior.

| Surface | Why |
|---|---|
| `formatCurrency` / `formatInvoiceStatus` | Pure display contracts; fast and stable in Jest |
| `InvoicesTable` headers, rows, empty | List UI contract without a server |
| `CreateInvoiceForm` typing, validation, cancel, keyboard | Form behavior is isolated UI; no need for a browser per message |
| `InvoicesTableSkeleton` accessible loading | Loading chrome is a unit-level a11y contract |
| `InvoicesSection` success / empty / reject (mocked `listInvoices`) | Async outcomes without hitting Supabase |
| `/invoices` `error.tsx` + retry | Recoverable error UI; unit is enough today |
| `createInvoice` mutation (mocked Supabase) | Write contract (snake_case insert + domain return + throw) |
| `CreateInvoiceView` success / error wiring (mocked action + router) | Persist boundary + navigate / alert without a real DB |

Soft unit gaps from Item 8 (`toInvoice` fallback, empty-name `"?"`, view cancel
line) stay **optional Jest polish** — they are **not** automatic Playwright work.

---

## Playwright

Journey / browser confidence. Add as Phase 2 items land; do not implement in
Item 1.

| Surface | Why | When |
|---|---|---|
| Open `/invoices` — heading + table visible | Proves Next route + real page load in a browser | Smoke (Item 2+) |
| Create invoice E2E: `/invoices` → `/invoices/new` → submit → row on list | Cross-layer hole RTL mocks cannot close (real navigate + persist + refresh) | Item 4 — `tests/e2e/create-invoice.spec.ts` (`uniqueTlCustomer("create")`) |
| Create loading → success + failure → alert + fields kept | Wait on app state (“Saving…”, alert, URL, values) — not `waitForTimeout` | Item 5 — same spec; see [`2-5-playwright-waiting.md`](./2-5-playwright-waiting.md) |
| Each write-path E2E owns a unique `tl_pw_*` customer | Shared table + `fullyParallel` — no “Test 2 assumes Test 1” | Item 6 — `uniqueTlCustomer`; see [`2-6-playwright-test-isolation.md`](./2-6-playwright-test-isolation.md) |

---

## Both

Same product area; different questions. RTL owns detail; Playwright owns the
journey.

| Area | Jest + RTL owns | Playwright owns |
|---|---|---|
| **List invoices** | Table / section / skeleton / error with mocks | Page loads with real or seeded data; list chrome in browser |
| **Create invoice** | Form contracts + mocked view wiring | Full create path: navigate → fill → submit → see row |

Do **not** re-assert every validation string or formatter label in Playwright if
RTL already owns it.

---

## Not worth testing

At E2E — and usually not as more unit either.

| Surface | Why |
|---|---|
| Thin `app/**/page.tsx` / `loading.tsx` shells | Composition only; covered indirectly by smoke / journeys |
| Barrel `index.ts` / `server.ts` re-exports | No behavior |
| `components/ui/*` (shadcn) | Design-system / third-party |
| Home marketing cards / theme chrome | Out of invoice focus |
| Edit / delete flows | **Not built** — do not invent features for Playwright demos |
| Re-asserting formatters through Playwright | Already protected at helper + table/form contracts |
| `createInvoiceAction` thin map as its own E2E | Implied by mutation unit + create journey |
| Soft unit branch gaps as E2E cases | Wrong layer; fix in Jest if you care |

---

## Align with Phase 1 inventory

Cross-check of [`1-8-testing-inventory.md`](./1-8-testing-inventory.md). Rules applied:

1. Item 8 **Should** → stay **Jest + RTL** (or **Both** if the area is also a journey).
2. Item 8 **Nice** soft gaps → **not** automatic Playwright work.
3. Cross-layer holes (real path RTL mocks away) → **Playwright** / **Both** for later — note only in Item 1.

### Should (unit) → boundary

| Item 8 surface | Boundary | Notes |
|---|---|---|
| `formatCurrency` / `formatInvoiceStatus` | **Jest + RTL** | No E2E duplicate |
| `InvoicesTable` headers, rows, empty | **Jest + RTL** (+ list area **Both**) | Browser owns page load, not every row edge |
| `CreateInvoiceForm` interactions | **Jest + RTL** (+ create area **Both**) | Playwright must not re-test every validation string |
| `InvoicesTableSkeleton` | **Jest + RTL** | Optional real-browser loading later only if needed |
| `InvoicesSection` success / empty / reject | **Jest + RTL** | Mocks stay; real list path is the smoke / journey |
| `/invoices` `error.tsx` + retry | **Jest + RTL** | Defer browser error recovery |
| `createInvoice` (mocked Supabase) | **Jest + RTL** | Real insert confidence comes from create E2E later |
| `CreateInvoiceView` wiring (mocked action) | **Jest + RTL** (+ create **Both**) | Mocked wiring ≠ full journey |

### Nice (unit) → boundary

| Item 8 surface | Boundary | Notes |
|---|---|---|
| `toInvoice` unknown → `"draft"` | Stay optional **Jest** | Not Playwright |
| Empty-customer `"?"` avatar | Stay optional **Jest** | Not Playwright |
| `CreateInvoiceView` cancel → `router.push` | Stay optional **Jest** | Form cancel already covered; not an E2E case |
| Non-`Error` reject message fallback | Stay optional **Jest** | Not Playwright |
| `InvoicesPageHeader` / “Create invoice” link | **Not worth** as dedicated unit; link is exercised by create E2E later | Do not add a header-only Playwright test |
| `createInvoiceAction` thin map | **Not worth** as its own suite | Covered by mutation unit + create journey |
| Home card copy | **Not worth** | Out of invoice focus |

### Doesn't need (unit) → boundary

| Item 8 surface | Boundary |
|---|---|
| Thin `app/**` shells | **Not worth** (smoke covers route load indirectly) |
| Barrels / type-only modules | **Not worth** |
| `components/ui/*` | **Not worth** |
| Full Next streaming / middleware | Wrong for more Jest; only consider later E2E if product-critical |
| Re-testing formatters via every consumer | **Not worth** in Playwright either |

### Uncovered / 0% files (Item 8 §3) → boundary

| File | Item 8 decision | Phase 2 boundary |
|---|---|---|
| `listInvoices.ts` (0%) | Document skip — mocked at section | Real path → list smoke / create→list journey (**Playwright** / **Both**) |
| `create-invoice-action.ts` (0%) | Document skip | Implied by mutation + create E2E — **Not worth** alone |
| Home cards / view barrels | Document skip | **Not worth** |
| `invoices-page-header.tsx` | Defer unit | Exercised by journeys; no dedicated E2E |
| `toInvoice` branch / table `"?"` / view cancel line | Defer unit | **Not** Playwright |

### Cross-layer holes (note only — do not implement in Item 1)

Item 8’s unit verdict was “no mandatory new tests.” That still holds for Jest.
These gaps are **across layers** — RTL cannot honestly close them:

| Hole | Why RTL is not enough | Boundary | When |
|---|---|---|---|
| **Create → persist → refreshed list** | Action + router + list query are mocked apart | **Both** / **Playwright** | Later journey (needs data strategy) |
| **`/invoices` route actually loads** | No Jest test hits Next over HTTP | **Playwright** | Item 2 smoke |

No new tests in this step.

---

## Key reminder

- **Jest + RTL** = cheapest confidence for isolated behavior.
- **Playwright** = confidence that wiring, routing, and data still work for a user.
- **Both** = depth + one thin journey — not two copies of the same assertions.
- **Not worth** = skip without guilt, especially features that do not exist yet.
