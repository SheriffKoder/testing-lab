# Invoices Performance Hypotheses

> Phase 4 · Item 1 · Build.
>
> Companion concepts:
> [`4-1-core-web-vitals-mental-model.md`](./4-1-core-web-vitals-mental-model.md).
>
> Predictions only — **no Lighthouse numbers, no code changes.** Item 2 measures
> these against lab baselines.

Inspected (read-only): `/`, `/invoices`, `/invoices/new` and the layers behind
them (`views/home`, `views/invoices`, `features/create-invoice`,
`entities/invoice`, root layout fonts/theme).

Each row: **surface** · **why it might matter** · **confidence**.

---

## Possible LCP candidates

| Surface | Hypothesis | Confidence |
|---|---|---|
| `/` — `app/page.tsx` | Largest paint is likely the **“Testing Lab” heading + intro text block**, or the **Invoices nav card** once painted — there is **no hero image**. | Medium |
| `/invoices` — header | `InvoicesPageHeader` (`h1` + subtitle + Create button) can paint with the static shell **before** the table streams in. May win LCP on a **slow** Supabase fetch if the table is still a skeleton. | Medium |
| `/invoices` — table | Once `InvoicesSection` resolves, **`InvoicesTable`** (bordered card + rows) is the largest content block and is the **most likely LCP** on a typical seeded list. | High |
| `/invoices` — empty state | Empty dashed card (`No invoices yet`) is smaller than a multi-row table; LCP may stay on the **header** or that card depending on viewport. | Low |
| `/invoices` — data path | `listInvoices()` → Supabase (`entities/invoice/queries/list-invoices.ts`) sits inside Suspense. **Slow TTFB / query latency** delays the table paint and can push LCP past 2.5s even if the shell is fast. | High |
| Root layout | `Geist` via `next/font` with `display: "swap"` (`app/layout.tsx`). Unlikely to *be* LCP, but late text metrics / swap can affect when text LCP candidates finish. | Low |
| `/invoices/new` | Create page is mostly heading + a **narrow form card** — smaller LCP risk than the list table; still text-dominated, no large media. | Low |

**Not present (so not LCP candidates today):** dashboard illustrations, `<img>`
heroes, background marketing art.

---

## Possible CLS risks

| Surface | Hypothesis | Confidence |
|---|---|---|
| `/invoices` — skeleton → table | `InvoicesTableSkeleton` always shows **5** placeholder rows (`SKELETON_ROWS = 5`). Final table height depends on **real row count** (or a shorter empty-state card). Height mismatch when Suspense resolves → **layout shift** of content below / perceived jump of the main block. | High |
| `/invoices` — skeleton ≠ table chrome | Skeleton uses a simpler strip layout (`rounded-lg`, flex rows); real table uses `rounded-xl`, true `<table>`, avatar chips, status pills. Structure differs → possible mid-block reflow even when row count ≈ 5. | Medium |
| `/invoices` — route `loading.tsx` | Same header + skeleton as Suspense fallback — good for consistency on navigation, but still inherits the fixed 5-row height risk. | Medium |
| `/` — ThemeSwitcher | Client-only: returns `null` until mounted (`components/theme-switcher.tsx`), then injects a button in the top-right. Small corner control → **minor** CLS if anything below reflows; low impact if space is empty. | Low |
| Root — font swap | Geist `display: "swap"` can reflow text metrics when the webfont settles. Whole-app text, including invoices table. | Low–Medium |
| Images / ads / banners | **None** in these routes — classic “image without dimensions” CLS is **not** a current risk. | n/a (absent) |

---

## Possible INP risks

| Surface | Hypothesis | Confidence |
|---|---|---|
| `/invoices/new` — form submit | `CreateInvoiceForm` validates sync on the main thread, then awaits `createInvoiceAction` + `router.refresh()` / `router.push` (`create-invoice-view.tsx`). Pending UI is fine; **heavy work after success** (refresh list RSC) may delay the “next paint” of navigation more than typing. | Medium |
| `/invoices/new` — typing / validation | Small controlled form (few fields). Sync validation on submit only — **unlikely** to be a real INP problem at current size. | Low |
| `/` — theme toggle | Dropdown + `setTheme` from `next-themes` re-styles via `class` on `<html>`. Can cause style/layout work; page is small, so risk stays **low** unless DevTools shows long tasks. | Low |
| `/invoices` — list interactions | Table is **presentational** (no filter/sort/row click handlers today). **No** “filter 10k rows sync” risk **yet**. | n/a (absent) |
| Client islands | Create flow and theme switcher are `"use client"`. List page is mostly RSC + Suspense. Hydration cost should be modest; still worth watching TBT in Item 2 as a **proxy**, not as INP. | Low |

---

## Likely irrelevant optimizations

Do **not** chase these for Core Web Vitals on the current app:

| Idea | Why it is probably noise now |
|---|---|
| `React.memo` / `useCallback` on `InvoicesTable` | Small static row lists; no chatty parent re-renders observed in the list path. |
| Memoizing `formatCurrency` / `formatInvoiceStatus` | Tiny pure helpers; already unit-tested; not on the critical interaction path at scale. |
| Adding `useMemo` “everywhere” for derived props | Violates “measure first”; no expensive derived trees on these pages. |
| Image CDN / `next/image` hero work | **No content images** on home or invoices routes. |
| Perfect Lighthouse SEO / Best Practices score | Phase 4 focuses on **Performance** outcomes; other categories are secondary. |
| Installing `web-vitals` / RUM now | Owned by **Item 7**, not Item 1. |
| Declaring unused deps “fixed LCP” without measuring | e.g. `gsap` / `@tanstack/react-query` appear unused in app source — cleanup may help bundle later, but is **not** proven LCP work until Item 2+ baselines exist. |

---

## What we will measure next (Item 2)

Names only — **no numbers in this item**:

- **LCP**, **CLS**, **FCP**, **TBT**, **TTFB** (where available), Performance score
- Form factors: **mobile** + **desktop** lab runs (Lighthouse)
- Primary URL: **`/invoices`** (optionally note `/` if it differs)
- **INP:** not claimed from a passive page load; TBT as diagnostic proxy only

Item 2 will check each hypothesis above: **supported / unclear / contradicted**.

---

## Hand-off

```text
Item 2 → measure lab baselines; triage Lighthouse findings.
Item 3+ → change one concern at a time; re-measure.
Item 7 → web-vitals / RUM / field data.
Item 8 → Lighthouse CI + budgets.
```
