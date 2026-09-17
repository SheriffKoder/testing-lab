# Lighthouse CI, Performance Budgets and Regression Protection

> Phase 4 · Item 8 · Concepts / explanation.
>
> Companion strategy (phase wrap-up — later plan steps):
> [`4-8-performance-strategy.md`](./4-8-performance-strategy.md)
> (not created yet).
>
> Builds on:
> [`4-7-performance-monitoring-strategy.md`](./4-7-performance-monitoring-strategy.md)
> (Dev / CI / Production split),
> [`4-2-performance-baseline.md`](./4-2-performance-baseline.md),
> [`4-3-lcp-experiment.md`](./4-3-lcp-experiment.md),
> [`4-6-nextjs-performance-audit.md`](./4-6-nextjs-performance-audit.md)
> (JS weight note).

Item 7 defined **where** measurement lives. Item 8 **wires CI** so performance
does not depend on someone remembering to open Lighthouse before a release.

Item 8 answers:

> Can a PR catch a **major performance regression** automatically — without
> requiring a perfect score of 100 every run?

This item **does** touch GitHub Actions / LHCI config (Phase 3 pipeline). Prefer
a **small** useful budget set from real baselines (Items 2–3, Item 6 JS note) —
not cargo-cult constants from a blog.

---

## Connect to Phase 3

Phase 3 already runs correctness gates (lint, typecheck, unit, build, e2e).
Item 8 adds the performance leg:

```text
Developer changes feature
↓
Jest / RTL
↓
Playwright
↓
Build
↓
Lighthouse CI
↓
Performance regression?
↓
PR feedback
```

Performance joins the engineering feedback loop — same spirit as tests in CI.
A green feature test does not prove the page stayed fast.

---

## What is a performance regression?

A **performance regression** is a change that makes the product meaningfully
slower or less stable than an agreed baseline — even when correctness and E2E
still pass.

Examples on `/invoices`:

- LCP jumps because a heavy script or image lands on the critical path
- CLS rises because layout shifts appear
- JS transfer grows a lot (e.g. from ~167 kB to much more)
- Lighthouse performance score drops past an agreed floor

It is **not** “score isn’t 100.” Small lab noise is normal. CI should catch
**real steps backward**, not every score flicker.

---

## Lighthouse CI and automated checks

**Lighthouse CI (LHCI)** runs Lighthouse in CI against a **production-style**
build (not `next dev`), stores or asserts results, and can fail or warn the PR.

### Why automate

| Manual Lighthouse | LHCI on the PR |
|---|---|
| Easy to skip under deadline pressure | Runs when the pipeline runs |
| One-off laptop conditions | Same job shape every time |
| Hard to compare across months | History / trends if stored |

One-off local runs are still useful for debugging (Item 2). They are not a
**gate**. CI is the gate for “did this PR make `/invoices` worse in lab?”

### Why scores fluctuate

Exact Lighthouse scores move because of:

- Machine load and shared CI runners
- Network / throttling simulation variance
- Timing races (fonts, cache, third parties)
- Slight differences between Chromium builds

That is why **blindly requiring Performance score 100** creates noisy CI:
teams ignore or disable flaky red checks. Prefer fewer, stabler assertions
calibrated from **your** baselines.

### Warn vs fail

| Mode | Intent |
|---|---|
| **Warn** | Soft signal — score or metric drifted; investigate, don’t block merge by default |
| **Fail** | Hard gate — clear catastrophe (e.g. CLS spike, JS balloon, score below a realistic floor) |

Policy sketch for this lab (to be wired later):

```text
Performance score
→ warn/fail below an agreed threshold (not 100)

CLS
→ protect against obvious regression (lab was 0)

Large resources / JS
→ detect accidental major increase vs Item 6 (~167 kB / 10 requests)
```

### Absolute thresholds vs regression-based thinking

| Style | Meaning | Tradeoff |
|---|---|---|
| **Absolute** | “LCP must be ≤ X ms” or “score ≥ Y” | Simple; must be calibrated or it fails forever / never |
| **Regression-based** | “Don’t get worse than baseline by more than Δ” | Tracks drift; needs stored history or compare-to-main |

This item leans on **few absolute floors/ceilings informed by baselines**, not
score-100 cult. Regression history (LHCI server / artifacts) is nice-to-have;
trends matter more than a single green check.

---

## Performance budgets

A **budget** is a product expectation expressed as a number CI can enforce.

Possible budgets (examples — pick from **your** baselines):

```text
LCP expectation
CLS expectation
Performance score floor
Maximum JavaScript size
Maximum image size
```

Calibration sources already in this repo:

| Source | Signal |
|---|---|
| Item 2 [`4-2-performance-baseline.md`](./4-2-performance-baseline.md) | Early lab floor (incl. `next dev` caveats) |
| Item 3 [`4-3-lcp-experiment.md`](./4-3-lcp-experiment.md) | Production-style Lighthouse mobile LCP after list cache (~1.5 s) |
| Item 6 [`4-6-nextjs-performance-audit.md`](./4-6-nextjs-performance-audit.md) | `/invoices` JS ~**167 kB** transferred / **10** requests |
| Item 4 lab | CLS **0** — protect against obvious layout regression |

Do **not** invent random numbers just so CI has something to enforce. Budgets
should represent meaningful product expectations for `/invoices`.

---

## Lab CI vs production field (Item 7 reminder)

| Layer | Question | Tooling |
|---|---|---|
| Development | Can I reproduce and compare a change? | DevTools / Lighthouse / local `[web-vitals]` |
| CI (this item) | Did this PR introduce a major **lab** regression? | Lighthouse CI + budgets |
| Production | What do real users experience (p75 / cohorts)? | RUM / CrUX when applicable |

LHCI does **not** replace RUM. It answers a different question: PR-time lab
regression protection on a production-style `/invoices` build.

---

## Inspect existing CI (Step 2)

Single workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
(Phase 3 Item 5 + Item 8 lighthouse job). Triggers: `pull_request` + `push`
to `main`.

### Jobs (parallel — no `needs`)

| Job | What it runs | Env / notes |
|---|---|---|
| `quality` | `npm run lint`, `npm run typecheck` | No secrets |
| `tests` | `npm test` (Jest) | No secrets |
| `build` | `npm run build` (`next build`) | Compile-only; unchanged |
| `e2e` | Playwright Chromium + `npm run test:e2e` | Supabase secrets; **`next dev`** |
| `lighthouse` | `next build` → `next start` via LHCI → budgets on `/invoices` | Same Supabase secrets; Playwright Chromium for Chrome |

Local full sequence is `npm run verify` / `npm run ci` — **not** invoked
inside the workflow (jobs call the individual commands). Phase 3 docs:
[`3-5-playwright-in-ci.md`](../testing/3-5-playwright-in-ci.md),
[`3-8-ci-cd-strategy.md`](../testing/3-8-ci-cd-strategy.md).

### Constraints for LHCI

| Constraint | Detail |
|---|---|
| OS | `ubuntu-latest` on every job |
| Node | `24.12.0` via `actions/setup-node@v7`, `cache: npm` |
| Timeouts | `lighthouse` job `timeout-minutes: 25`; others use GitHub default |
| Secrets | `e2e` + `lighthouse`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ([`3-6-ci-secrets-and-environments.md`](../testing/3-6-ci-secrets-and-environments.md)) |
| E2E serve style | Playwright `webServer` uses **`npm run dev`** — unchanged |
| Build job | Production compile only — does **not** start a server — unchanged |
| LHCI | [`lighthouserc.cjs`](../../lighthouserc.cjs) + `@lhci/cli`; `npm run lhci` |
| Chrome on GHA | `chromeFlags: --no-sandbox --disable-dev-shm-usage` (runner sandbox) |
| Deploy | Vercel (outside this workflow) — no deploy job for Item 8 |

### Where LHCI attached (Option A — done)

New parallel `lighthouse` job:

1. `npm ci` → install Playwright Chromium → `npm run build`
2. LHCI `startServerCommand: npm run start` (production-style)
3. Collect **`http://localhost:3000/invoices`** (3 runs, mobile defaults)
4. Assert the small budget set below; upload `.lighthouseci/` as an artifact

Existing `build` / `e2e` jobs were **not** merged or remodeled. No shared
“serve once for everyone” pipeline.

---

## Wired budgets (Step 3)

Config: [`lighthouserc.cjs`](../../lighthouserc.cjs). Local / CI:
`npm run build && npm run lhci` (with Supabase env + Chrome available).

| Assertion | Level | Threshold | Why |
|---|---|---|---|
| `categories:performance` | **warn** | minScore **0.65** | Below Item 2 mobile ~0.77 with CI noise headroom; **not** 1.0 |
| `cumulative-layout-shift` | **error** | max **0.1** | Lab CLS was 0; hard-fail obvious layout regression (CWV “good”) |
| `largest-contentful-paint` | **warn** | max **4000** ms | Item 3 after-cache ~1.5 s; 4 s catches major LCP regression |
| `resource-summary:script:size` | **error** | max **400000** bytes | Item 6 ~167 kB JS + headroom; hard-fail accidental balloon |

Aggregation: **median** across 3 runs. Upload target: **filesystem**
(`.lighthouseci/`, gitignored; CI artifact `lighthouse-report`).

Warns surface in logs without failing the job by themselves; errors fail the
`lighthouse` job (and thus the workflow).

---

## Regression exercise (Step 4 — done)

Proved the gate with a temporary large **blocking** script on `/invoices`, then
removed it.

| Phase | Result |
|---|---|
| Break | Sync `<script src>` + high-entropy `public/item-8-regression-blocking.js` via `app/invoices/layout.tsx` |
| CI catch | `resource-summary:script:size` **error** — expected ≤ 400000, found **592970**; LCP **warn** ~4355 ms (≤ 4000) |
| Fix | Deleted layout + public asset; no intentional regression left on the branch |

**Debugging path used (same as a real PR):** failed assertion in the job log →
which budget → `git diff` / Network for the new JS URL → remove the owner of
the weight → re-run LHCI.

**Lesson:** LHCI script budgets use **transfer size**. A 450 kB file of
repeated `a` gzip’d to ~685 bytes and still passed; an incompressible payload
was required to trip the error.

---

## Build (remaining plan steps)

1. ~~Inspect existing Phase 3 GitHub Actions workflow(s).~~ **Done**.
2. ~~Add LHCI config; collect against `/invoices` on `next build` + `next start`.~~ **Done**.
3. ~~Wire a **small** assertion set (warn/fail sensibly; no score 100).~~ **Done**.
4. ~~Regression exercise: intentional break → CI catches → fix → green.~~ **Done**.
5. Draft [`4-8-performance-strategy.md`](./4-8-performance-strategy.md)
   (phase wrap-up: metrics → diagnostics → local → CI → production).

Primary URL and serve target remain locked: `/invoices`, production build only.

---

## Verification (target pipeline)

```text
Lint → Type check → Jest/RTL → Build → Playwright → Lighthouse CI → Deploy
```

Verify that correctness, E2E, build, and **major** performance regressions are
caught. Deployment stays as Phase 3 / Vercel already defines — do not invent a
new deploy job unless Phase 3 already expects it.

---

## Explicit non-goals

- Requiring Lighthouse Performance score **100** on every PR
- Replacing Phase 3 correctness / E2E jobs
- Building a RUM backend (Item 7 reporter only)
- Perfect flaky-score chasing — reduce assertions instead of widening noise
- Leaving an intentional regression on `main` after the drill

---

## Key insight

Performance should not depend on somebody remembering to open Lighthouse before
every release.

Once performance requirements matter to a product, they should become part of
the engineering feedback loop — with budgets grounded in baselines, not vanity
scores.

---

## Status

| Step | State |
|---|---|
| Concepts doc (this file) | **Done** |
| Inspect Phase 3 CI | **Done** |
| LHCI config + GitHub Actions | **Done** (Option A: `lighthouse` job) |
| Regression exercise | **Done** — catch (script size 592970) → remove break → expect green |
| `4-8-performance-strategy.md` | Pending |
