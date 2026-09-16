# Performance Monitoring Strategy

> Phase 4 · Item 7 · Build / strategy.
>
> Concepts:
> [`4-7-real-user-monitoring.md`](./4-7-real-user-monitoring.md).
>
> Reporter decision: **Option B** — lightweight `WebVitalsReporter` via
> `next/web-vitals` in the root layout. Console in non-production; optional
> `sendBeacon` when `NEXT_PUBLIC_WEB_VITALS_ENDPOINT` is set. No analytics
> platform.

## Big picture

```text
Development
→ DevTools / Lighthouse

CI
→ Lighthouse CI

Production
→ RUM / CrUX / analytics
```

Each layer answers a different question. None replaces the others.

| Layer | Question |
|---|---|
| Development | Can I reproduce and compare a change on `/invoices`? |
| CI | Did this PR introduce a major lab regression? |
| Production | What are real users experiencing (p75 / cohorts)? |

---

## Development

### What we measure

| Tool | Metrics / signals | When |
|---|---|---|
| Chrome DevTools (Performance, Network, local CWV) | LCP, CLS, INP (on real interactions), long tasks, waterfall | Day-to-day debugging |
| Lighthouse (mobile + desktop) on `next start` | LCP, CLS, TBT, FCP, score — **lab** | Before/after experiments (Items 2–3) |
| React DevTools Profiler | Re-render cost after interactions | INP / main-thread hunts (Item 5 concepts) |

### What we do **not** treat as field truth

- `next dev` timings (Item 2 lesson)
- Passive Lighthouse load as **INP** (TBT ≠ INP)
- A single local score as “users are fine”

### Optional local reporter (**added — Option B**)

`shared/performance` mounts `WebVitalsReporter` in `app/layout.tsx` (tiny
client island; layout stays a Server Component).

```text
LCP / INP / CLS
+ route
+ device  (formFactor, hardwareConcurrency, truncated UA)
+ release (NEXT_PUBLIC_APP_VERSION or "local")
→ console.info("[web-vitals]", …)   when NODE_ENV !== "production"
→ sendBeacon(endpoint)              when NEXT_PUBLIC_WEB_VITALS_ENDPOINT is set
```

Uses Next’s `useReportWebVitals` (`next/web-vitals`) — same browser metrics as
the `web-vitals` library, no extra dependency.

### Lab baselines to reuse

- [`4-2-performance-baseline.md`](./4-2-performance-baseline.md)
- [`4-3-lcp-experiment.md`](./4-3-lcp-experiment.md) (cached list LCP)
- [`4-6-nextjs-performance-audit.md`](./4-6-nextjs-performance-audit.md) (~167 kB JS / 10 requests on `/invoices`)

---

## CI

### What we measure

**Lighthouse CI** against a **production-style** build of `/invoices` — not
`next dev`.

Purpose: catch **major** regressions on PRs (score floor, CLS spike, accidental
huge JS/image), with warn vs fail calibrated from baselines.

### Ownership

| Concern | Owner |
|---|---|
| Naming CI in this strategy | Item 7 (this doc) |
| Wiring LHCI + budgets into GitHub Actions | **Item 8** |

Do not duplicate LHCI config here. Item 8 connects to the Phase 3 pipeline:

```text
Lint → Typecheck → Jest/RTL → Build → Playwright → Lighthouse CI
```

### Policy preview (Item 8 will set numbers)

- Prefer a few stable checks over score **100**
- Use Item 2/3/6 numbers as calibration, not blog defaults
- Expect score noise → warn vs fail deliberately

---

## Production

### What we **would** measure

| Source | Role for this product |
|---|---|
| Own RUM via `web-vitals` → analytics / beacon | Primary field path for an app without public CrUX volume |
| CrUX / PSI field / Search Console | Only if the URL is public with enough Chrome traffic |
| Release / route / device dimensions | Slice slow cohorts (e.g. `/invoices/new` INP on mid phones) |

Example event shape (contract — not implemented):

```text
LCP | INP | CLS
route          e.g. /invoices
device          coarse UA / form factor if available
release/version  deploy SHA or app version
```

Production send path (conceptual): `sendBeacon` / analytics SDK → store →
dashboard with **p75** (and route breakdowns).

### Limits for this lab

- Likely **no** meaningful CrUX until the site is public and trafficked
- No analytics backend in-repo — documenting the contract is enough for Item 7
- Field INP needs real interactions; lab alone will not prove it

---

## Verification scenario

> Lighthouse locally says the page is excellent, but production users report
> poor INP.

Investigation steps:

1. **Confirm field data** — RUM/analytics INP for the reported route and time
   window; check p75 and device split (not one angry screenshot).
2. **Reproduce the interaction** — same flow users hit (submit, navigate, type).
   Passive Lighthouse load will not show INP.
3. **Profile main thread** — Performance panel + React Profiler on that path;
   look for long tasks after input.
4. **Check what lab missed** — larger datasets, third-party scripts, different
   release, slow CPU/network cohorts.
5. **Bisect release** — compare version tags; Item 6-style “what JS/hydration
   grew?” if a deploy correlates.

Lab excellence and field INP pain can both be true; the fix lives in the
interaction path (or third parties), not in “run Lighthouse again.”

---

## What would change if we shipped RUM for real

| Today (lab) | Production |
|---|---|
| DevTools / Lighthouse + console `[web-vitals]` | Same local tools + **continuous field stream** |
| Endpoint env unset → no beacon | Set `NEXT_PUBLIC_WEB_VITALS_ENDPOINT` (or analytics SDK) + dashboards |
| Item 8 LHCI on PRs | LHCI stays; RUM catches what CI cannot (real INP, devices) |
| CrUX unused / empty | Optional extra if public traffic appears |

---

## Explicit non-goals (Item 7)

- Building an analytics platform or warehouse
- Wiring Lighthouse CI (Item 8)
- Requiring CrUX numbers for this private/lab app
- Re-opening LCP/CLS/INP code experiments as the monitoring goal
- Forcing the whole `/invoices` tree to `"use client"` for reporting

---

## Hand-off

Next (Item 8): Lighthouse CI, performance budgets, regression protection —
wire automated checks to Phase 3 GitHub Actions against a production-style
`/invoices` build. Use Item 2/3/6 baselines for thresholds; do not require
score 100.
