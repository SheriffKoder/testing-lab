# Performance Strategy — Phase 4 wrap-up

> Phase 4 · Item 8 · Final strategy.
>
> CI concepts + regression drill:
> [`4-8-performance-ci.md`](./4-8-performance-ci.md).
>
> Monitoring layers (Dev / CI / Production):
> [`4-7-performance-monitoring-strategy.md`](./4-7-performance-monitoring-strategy.md).

This document is the **phase close-out**: what we measure, how we diagnose,
where we check locally, what CI protects, and what production still needs.

---

## Learning trail (Items 1–8)

| Doc | Role |
|---|---|
| [`4-1-core-web-vitals-mental-model.md`](./4-1-core-web-vitals-mental-model.md) | LCP / INP / CLS mental model |
| [`4-1-invoices-performance-hypothesis.md`](./4-1-invoices-performance-hypothesis.md) | `/invoices` hypotheses |
| [`4-2-performance-measurement-tools.md`](./4-2-performance-measurement-tools.md) | Lab tools; lab vs field |
| [`4-2-performance-baseline.md`](./4-2-performance-baseline.md) | First `/invoices` lab baseline |
| [`4-3-lcp-optimization.md`](./4-3-lcp-optimization.md) | LCP concepts |
| [`4-3-lcp-experiment.md`](./4-3-lcp-experiment.md) | List Data Cache → LCP win |
| [`4-5-inp-and-interactivity.md`](./4-5-inp-and-interactivity.md) | INP concepts (docs-only) |
| [`4-6-nextjs-performance.md`](./4-6-nextjs-performance.md) | RSC / Suspense / fetch architecture |
| [`4-6-nextjs-performance-audit.md`](./4-6-nextjs-performance-audit.md) | `/invoices` tree + JS weight |
| [`4-7-real-user-monitoring.md`](./4-7-real-user-monitoring.md) | Lab vs RUM / p75 |
| [`4-7-performance-monitoring-strategy.md`](./4-7-performance-monitoring-strategy.md) | Dev / CI / Prod plan + reporter |
| [`4-8-performance-ci.md`](./4-8-performance-ci.md) | LHCI, budgets, regression drill |

Item 4 (CLS) stayed concepts-only — lab CLS was already 0.

---

## Metrics (what “good” means)

| Metric | Question | Threshold mindset |
|---|---|---|
| **LCP** | How soon is the main content useful? | Improve the real bottleneck (Item 3: server data wait); protect in CI with a soft ceiling |
| **INP** | How soon does the UI respond after input? | Needs real interactions; Lighthouse TBT ≠ INP (Item 5) |
| **CLS** | Does the layout jump while loading? | Lab was 0; CI hard-fails obvious regression (≤ 0.1) |

Use **p75** in the field (Item 7). A single local Lighthouse score is not field truth.

---

## Diagnostics (when a metric is bad)

| Signal | Use for |
|---|---|
| **TTFB** | Origin / edge latency (Item 2: not the `/invoices` LCP story) |
| **FCP** | First paint vs LCP gap |
| **TBT** | Lab main-thread proxy only — not INP |
| **Long tasks** | Performance panel; React work after input |
| **Network waterfall** | Blocking scripts, late data, large transfers |
| **React Profiler** | Re-render storms after interaction (Item 5) |
| **Architecture map** | Server vs Client, Suspense, fetch waterfalls (Item 6) |

Fix the stage that owns the delay — do not “optimize” an unrelated layer.

---

## Local (Development)

| Tool | When |
|---|---|
| Chrome DevTools (Performance, Network, local CWV) | Day-to-day |
| Lighthouse on **`next start`** (not `next dev`) | Before/after experiments |
| React DevTools Profiler | INP / render cost |
| `[web-vitals]` console via `WebVitalsReporter` | Optional local field-shaped signals (Item 7) |

Local full correctness sequence: `npm run verify`. Performance gate locally:
`npm run build && npm run lhci` (Supabase env + Chrome).

---

## CI (what we wired — Item 8)

| Piece | Value |
|---|---|
| Workflow | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — parallel `lighthouse` job |
| Config | [`lighthouserc.cjs`](../../lighthouserc.cjs) |
| Serve | `next build` + `next start` (not Playwright’s `next dev`) |
| URL | `http://localhost:3000/invoices` (3 runs, median) |
| Chrome on GHA | `--no-sandbox --disable-dev-shm-usage` |

### Budgets (baseline-informed; not score 100)

| Assertion | Level | Threshold |
|---|---|---|
| Performance score | warn | ≥ 0.65 |
| CLS | error | ≤ 0.1 |
| LCP | warn | ≤ 4000 ms |
| Script transfer size | error | ≤ 400000 bytes |

### Regression drill (proven)

Intentional sync blocking script → CI **failed**
`resource-summary:script:size` (found **592970**) + LCP warn → removed →
**all jobs green** (including `lighthouse`).

Lesson: script budgets use **transfer size** (gzip); compressible junk does not
count as a real balloon.

---

## Production (field)

| Piece | Status in this lab |
|---|---|
| Lightweight RUM reporter | **Wired** — `WebVitalsReporter` + optional `sendBeacon` |
| Analytics / warehouse | **Not** built |
| CrUX / PSI field URL | Often empty for private/lab apps |
| Question answered | What do real users experience (p75 / device / release)? |

CI does not replace RUM. RUM does not replace PR-time lab gates.

---

## Verification (full pipeline)

Confirmed on PR [#2](https://github.com/SheriffKoder/testing-lab/pull/2) after
the regression fix:

```text
Lint → Typecheck → Jest/RTL → Build → Playwright → Lighthouse CI
```

| Gate | Still works? |
|---|---|
| Correctness (`quality` / `tests`) | Yes |
| E2E (`e2e`) | Yes |
| Build (`build`) | Yes |
| Major perf regressions (`lighthouse`) | Yes — proven by Step 4 drill |

Deploy remains Phase 3 / Vercel — no new deploy job in Item 8.

---

## Phase 4 done when

```text
Measure (lab baseline)
→ Improve selectively (e.g. LCP cache)
→ Protect in CI (LHCI budgets)
→ Understand field (RUM concepts + lightweight reporter)
```

No further Phase 4 items. Performance stays in the engineering feedback loop:
local tools for diagnosis, CI for major lab regressions, production for real
users — without requiring Lighthouse score 100 on every PR.
