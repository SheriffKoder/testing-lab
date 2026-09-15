# Performance Measurement Tools

> Phase 4 · Item 2 · Concepts / explanation.
>
> Companion baseline (numbers + triage):
> [`4-2-performance-baseline.md`](./4-2-performance-baseline.md)
> (created in later plan steps — Measure / Build).
>
> Builds on Item 1:
> [`4-1-core-web-vitals-mental-model.md`](./4-1-core-web-vitals-mental-model.md),
> [`4-1-invoices-performance-hypothesis.md`](./4-1-invoices-performance-hypothesis.md).

Item 1 defined **what** Core Web Vitals mean and wrote **hypotheses** for the
invoice app.

Item 2 answers:

> How do we measure those outcomes without fooling ourselves?

Still **no optimization**. The job is a repeatable baseline and a sober reading
of tool output.

---

## The measurement toolkit

### Lighthouse

Automated audit in Chrome DevTools (or CLI/CI later). Runs a simulated page
load and scores categories. For this phase the focus is **Performance**; Lighthouse
also reports Accessibility, Best Practices, and SEO — useful, but not the
optimization target here.

Lighthouse is **lab** data: controlled device/network emulation, not your real
users.

### Chrome DevTools Performance panel

Timeline of main-thread activity, rendering, networking. Best when you already
suspect *where* time goes (long tasks, layout, script evaluation) and need a
trace, not a single score.

### Performance Insights (DevTools)

A more guided panel that highlights likely issues (e.g. LCP element, render
blocking, layout shifts) with less raw-timeline noise. Good bridge between
Lighthouse “what’s wrong” and Performance “show me the milliseconds.”

### PageSpeed Insights (PSI)

Web UI that can show:

- **Lab** data (Lighthouse-like)
- **Field** data from the Chrome User Experience Report when enough real-user
  traffic exists for the URL

For a local or low-traffic lab app, field data may be **missing**. That is
normal — do not invent CrUX numbers.

### Chrome User Experience Report (CrUX)

Anonymized real-user metrics from opted-in Chrome users. Powers much of PSI’s
field section. Represents **field** Core Web Vitals at origin/URL granularity
when volume allows.

Public sites with enough Chrome traffic can use CrUX via PSI, Search Console,
or the CrUX API. Internal / auth-gated / localhost apps typically have **no**
CrUX data — use lab tools and (later) your own RUM instead.

---

## Why tools disagree

Different tools can return different numbers because they differ in:

| Factor | Effect |
|---|---|
| Throttling profile | “Mobile” is a simulation, not your phone |
| Cache state | Cold vs warm load |
| CPU load on the host | Other apps steal cores |
| Extensions | Ad blockers / React DevTools alter the page |
| Which URL / environment | `localhost` ≠ production CDN |
| Sampling / variance | One run is not truth |
| Lab vs field | Simulation ≠ real devices/networks |

Treat a single Lighthouse score as a **sample**, not a verdict.

---

## Mobile vs desktop

Always record **both** (or be explicit if you only care about one product
surface). Mobile emulation is usually harsher (slower CPU/network) and closer
to how Core Web Vitals are often judged. Desktop can hide problems that mobile
exposes — or the reverse for heavy desktop layouts.

---

## Network and CPU throttling

Lab tools apply **network throttling** (e.g. Slow 4G) and **CPU throttling**
(e.g. 4× slowdown) so a fast laptop approximates weaker devices.

If you turn throttling off, scores look better and comparisons across machines
become less meaningful. For baselines in this lab: use Lighthouse’s default
mobile/desktop presets unless documenting a deliberate change.

---

## Cold load vs warm load

- **Cold:** empty cache, first visit — harder; closer to new users
- **Warm:** cached assets — faster; closer to return visits

Baselines should state which you used. Prefer **cold** (or Lighthouse’s
standard run mode) for comparable “before” numbers. Do not mix cold and warm
when claiming an improvement later.

---

## Repeatability and variance

Run Lighthouse **more than once**. Expect score and metric jitter.

Variance comes from:

- Background CPU
- Network to Supabase / APIs during SSR
- Non-deterministic scheduling
- Slightly different paint candidates

Record a small range or median + notes, not a fake precision of “LCP =
1234ms forever.”

---

## What Lighthouse audits beyond performance

| Category | Rough meaning |
|---|---|
| Accessibility | A11y tree / ARIA / contrast issues |
| Best practices | Security / modern API hygiene |
| SEO | Crawl/index basics (meta, crawlable content) |

Acknowledge them. **Do not** turn Phase 4 into an a11y/SEO sprint unless a
finding blocks performance understanding.

---

## Lab vs field data

### Lab data

Controlled / simulated environment.

**Useful for:** development, debugging, reproducing issues, CI, comparing a
change before vs after.

**Examples:** Lighthouse, DevTools Performance / Insights.

### Field data

Real users on real devices, networks, locations, browsers, hardware.

**Useful for:** production truth, problems lab misses, segmenting slow cohorts.

**Examples:** CrUX, RUM libraries (later items), PSI field section when present.

```text
Lab  → “Can I reproduce and compare?”
Field → “What do users actually experience?”
```

Both matter. Item 2 is mostly **lab**, because this app may have no CrUX data.

---

## Important INP distinction

Loading a page in Lighthouse does **not** fully exercise real-world **INP**.
INP needs user interactions across the lifecycle.

Lighthouse often surfaces **TBT** (and related lab diagnostics) as a
**responsiveness proxy**. That helps find main-thread risk; it is not INP.

```text
TBT !== INP
```

For Item 2 baseline: record TBT from Lighthouse, note INP as “needs interaction
/ field or dedicated testing later,” and do not claim an INP number you did not
measure.

---

## Build (conceptual)

Run a baseline audit of the invoice application (primary URL: `/invoices`). Use
Lighthouse + DevTools, mobile + desktop. Record LCP, CLS, TBT, FCP, TTFB where
available, and Performance score into
[`4-2-performance-baseline.md`](./4-2-performance-baseline.md).

Triage Lighthouse recommendations into:

```text
Likely meaningful
Possibly meaningful
Noise / not relevant to this app
```

Do **not** optimize yet.

---

## Verification

Run Lighthouse more than once. Compare. Explain why exact numbers move between
runs (variance section above).

---

## Key Insight

Never optimize from intuition alone.

```text
Measure
↓
Find bottleneck
↓
Form hypothesis
↓
Change
↓
Measure again
```

Item 1 was hypothesis. Item 2 is measure. Change starts at Item 3+.
