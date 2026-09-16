# Real User Monitoring and Field Performance

> Phase 4 · Item 7 · Concepts / explanation.
>
> Companion strategy (Dev / CI / Production):
> [`4-7-performance-monitoring-strategy.md`](./4-7-performance-monitoring-strategy.md)
> (created in later plan steps — Build).
>
> Builds on:
> [`4-2-performance-measurement-tools.md`](./4-2-performance-measurement-tools.md)
> (lab vs field),
> [`4-1-core-web-vitals-mental-model.md`](./4-1-core-web-vitals-mental-model.md).

Items 1–6 covered metrics, lab measurement, and app-owned fixes (LCP cache,
architecture audit). Items 4–5 stayed docs-only when lab CLS/INP were already
fine.

Item 7 answers:

> What do **real users** experience — and how is that different from Lighthouse
> on your laptop?

This item adds a **lightweight** Web Vitals reporter (`WebVitalsReporter` via
`next/web-vitals`). It does **not** build an analytics platform. Lighthouse CI
belongs to Item 8.

---

## Lab monitoring

You control:

- Device simulation
- Network throttling
- Which page / route
- Test conditions (cold cache, `next start`, etc.)

Useful **before shipping**: find regressions early, reproduce bugs, compare
before/after (Items 2–3).

| Lab strength | Lab limit |
|---|---|
| Repeatable comparisons | Not every device / network / dataset |
| Fast feedback while coding | Misses rare slow cohorts |
| Good for proving a fix | Score 100 locally ≠ field pass |

Lab is necessary. Lab is not sufficient.

---

## Real User Monitoring — RUM

**RUM** = measurements from actual user sessions in production (or staging with
real traffic patterns).

Different users may have:

- Slow phones vs powerful laptops
- Slow 4G vs fast Wi-Fi
- Different countries / latency to origin
- Large datasets (more invoice rows → different LCP / INP)
- Different interaction patterns (never opens create vs heavy form use)

Why this matters:

```text
My Lighthouse score is 100
```

does **NOT** guarantee:

```text
Every user has a fast experience
```

Item 2 already separated lab vs field. **CrUX** (Chrome’s public field dataset)
needs enough public Chrome traffic. An internal or low-traffic lab app usually
needs **your own** RUM (or accepts that field CWV dashboards will be empty) —
not CrUX alone.

```text
Lab  → “Can I reproduce and compare?”
Field → “What do users actually experience?”
```

---

## 75th percentile thinking

Core Web Vitals field thresholds are judged at a **high percentile** (commonly
**p75**), not only the average.

Example:

```text
Most users: fast
Some users: extremely slow
```

An average can look “fine” while a meaningful slice of users has a bad day.

**p75** asks, roughly: are most sessions good enough that even the slower end of
that majority still clears the bar? A few catastrophic outliers matter for
support, but product CWV goals focus on the experience of the bulk of traffic —
without letting averages hide a large “kinda slow” middle.

---

## Measurement options (conceptual)

| Option | What it is | Fit for this lab |
|---|---|---|
| Chrome UX Report (CrUX) | Public Chrome field dataset | Needs enough public Chrome traffic |
| PageSpeed Insights (field) | Often surfaces CrUX for a URL | Same traffic caveat |
| Search Console | CWV report for Search-property URLs | Public site + Search |
| `web-vitals` library | Browser helpers for LCP / INP / CLS | Good lab → production bridge |
| Analytics providers | GA / etc. with web-vitals hooks | Production path |
| Custom telemetry | Your endpoint + dashboards | Do **not** build a platform here |

### What an app might report

```text
LCP
INP
CLS
route
device information
release/version
```

Ship the **smallest** reporter if Build adds code — e.g. `console` in
development, or a stub `sendBeacon` shape that documents the production
contract without a real backend.

---

## How this fits the phase

```text
Development
→ DevTools / Lighthouse          (Items 2–6)

CI
→ Lighthouse CI                  (Item 8 owns wiring)

Production
→ RUM / CrUX / analytics         (this item’s field story)
```

---

## Verification scenario (conceptual)

> Lighthouse locally says the page is excellent, but production users report
> poor INP.

Investigation direction:

1. Confirm **field** INP (RUM / analytics) — slice by route, device, release.
2. Reproduce the **interaction** lab never ran (Lighthouse load ≠ INP).
3. Check third-party scripts, large datasets, and main-thread work after click.
4. Compare builds: did a release add client JS or sync work on the hot path?

Lab excellence and field INP pain can both be true.

---

## Key Insight

Lab performance helps **prevent** problems.

Field performance tells you what users are **actually** experiencing.

Production performance engineering requires **both**.

---

## Hand-off

Reporter is live: see `shared/performance` + strategy
[`4-7-performance-monitoring-strategy.md`](./4-7-performance-monitoring-strategy.md).
Next (Item 8): wire Lighthouse CI.
