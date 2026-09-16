# LCP Experiment — `/invoices` list cache

> Phase 4 · Item 3 · Build.
>
> Concepts:
> [`4-3-lcp-optimization.md`](./4-3-lcp-optimization.md).
>
> Baseline context:
> [`4-2-performance-baseline.md`](./4-2-performance-baseline.md).

**One concern:** server Data Cache for `listInvoices` (2 minutes) so LCP no longer
waits on a cold Supabase round-trip on every request.

---

## Context

| Field | Value |
|---|---|
| URL | `/invoices` |
| Environment | `next start` (production build) |
| Date | 2026-09-16 |
| Form factor | Lighthouse mobile (Clear storage on unless noted) |
| LCP element (before) | `span.font-medium.text-foreground` — customer name in a visible table row (data-dependent) |
| Why LCP waited | Row text only paints after `listInvoices` / Supabase returns (~1.0–1.5 s on Network) |

Supporting observations (before change):

| Lens | Result |
|---|---|
| Performance (refresh) | LCP **1.29 s** (good) |
| Lighthouse mobile | LCP **2.7 s** |
| Network (cache disabled) | invoices data ~**1.5 s** |
| Network (browser cache on) | ~**1.0 s** |

---

## Hypothesis

LCP is gated by server data for the table row text. Caching `listInvoices` in the
Next Data Cache (`revalidate: 120`) will cut that wait on cache **hit** requests
and improve Lighthouse LCP, without moving the list fetch to the client.

---

## Change made

| Piece | What |
|---|---|
| `lib/supabase/public-server.ts` | Cookie-free anon client (safe inside `unstable_cache`) |
| `entities/invoice/queries/list-invoices.ts` | `unstable_cache(..., { revalidate: 120, tags: ["invoices"] })` |
| `features/create-invoice/server/create-invoice-action.ts` | `updateTag("invoices")` after create (read-your-own-writes) |

No image/`next/image` work. No skeleton/CLS changes. No client-side list fetch.

---

## Results

```text
Before (Lighthouse mobile, next start, no list Data Cache)
LCP  2.7 s

After (Lighthouse mobile, next start, list Data Cache — 2 min)
LCP  1.5 s
```

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| LCP (Lighthouse mobile) | 2.7 s | **1.5 s** | **−1.2 s** (~44%) |

Optional spot checks (not required for pass/fail):

| Metric | Before | After |
|---|---:|---:|
| Performance panel LCP (refresh) | 1.29 s | (not re-recorded) |

**Did LCP improve?** Yes.

---

## Why it changed

```text
Before: each lab navigation → cache miss → await Supabase → paint row text (LCP)
After:  cache hit within 120s → skip Supabase wait → row text paints sooner (LCP)
```

Stage in the LCP path: **server / data wait** (not TTFB of an empty shell, not
images). Suspense still streams the shell early; the LCP **element** remains
table row text — caching shortens time-to-that-element.

Protocol note: default Lighthouse clears **browser** storage; the win here is
**server Data Cache**, which survives that. First request after deploy/restart
may still be a miss; measure a second run within 2 minutes for the hit case.

---

## Explicit non-goals

```text
No CLS skeleton alignment (Item 4).
No INP work on home → invoices (Item 5).
No pagination / limit-5 as the LCP fix.
No client-side fetching of the list.
```

---

## Hand-off for Item 4

```text
Next (Item 4): visual stability / CLS — skeletons, space reservation, fonts.
Do not reopen LCP unless a CLS fix accidentally regresses it (then re-measure).

LCP lesson carried forward: data-dependent LCP improves with cache / faster
query / prefetch — not with matching skeleton height.
```
