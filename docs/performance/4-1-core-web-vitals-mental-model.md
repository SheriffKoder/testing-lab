# Core Web Vitals Mental Model

> Phase 4 · Item 1 · Concepts / explanation.
>
> Companion hypotheses (this app):
> [`4-1-invoices-performance-hypothesis.md`](./4-1-invoices-performance-hypothesis.md).
>
> Builds on Phase 3 quality gates
> ([`../testing/3-8-ci-cd-strategy.md`](../testing/3-8-ci-cd-strategy.md)).
> Measurement tooling is Item 2.

Phases 1–3 asked: *Does the code behave correctly, and is that proven before
merge?*

Phase 4 asks:

> Does the user experience the page as fast, responsive, and visually stable?

This item does **not** run Lighthouse or change the app. It locks the mental
model so later items measure against a shared vocabulary instead of optimizing
from intuition.

---

## Web Vitals vs Core Web Vitals

**Web Vitals** are metrics Google defined to represent how real users experience
a page: loading, interactivity, and visual stability — not arbitrary lab timings
like “DOMContentLoaded at 847ms.”

**Core Web Vitals** are the current **primary** subset used for UX quality (and
as ranking signals). Today that set is:

| Metric | User question |
|---|---|
| **LCP** | Did the main content appear quickly? |
| **INP** | Did the page respond quickly when I interacted? |
| **CLS** | Did the layout stay stable while things loaded? |

Supporting metrics (TTFB, FCP, TBT, etc.) help **diagnose** why a Core Web Vital
is poor. They are not substitutes for the outcome metrics.

---

## Why Google created them

Teams used to optimize whatever was easy to measure: smaller bundles, fewer
requests, higher Lighthouse scores. Those can help, but they do not always map
to what users feel.

Core Web Vitals force a shared language:

- **Outcome-first** — what the user saw / felt
- **Comparable** — thresholds that mean “good / needs improvement / poor”
- **Cross-stack** — HTML, CSS, JS, images, fonts, server latency all feed the
  same scores

They exist so product, SEO, and engineering argue about the **same** user
experience, not three different dashboards.

---

## Performance is UX

A correct invoice table that paints late, janks on every click, or jumps when
rows arrive still fails the user. Performance is part of product quality, same
as accessibility and correctness.

Slow UX costs:

- Abandoned flows (“create invoice” never finishes feeling usable)
- Mis-clicks when content shifts under the finger
- Distrust (“is this broken or just slow?”)

---

## Performance is also SEO

Search engines use page experience signals, including Core Web Vitals, as one of
many ranking factors. A lab score of 100 is not a ranking guarantee — but
consistently poor field LCP/INP/CLS is a real risk for discoverability.

For this lab: treat SEO as **why companies care**, not as the reason to chase a
perfect Lighthouse number on `/invoices`.

---

## Metrics should represent experience

Prefer:

> “Largest visible content took 4s to appear.”

Over:

> “We shaved 12KB off a dependency the LCP element never waited on.”

Technical timings are tools. User-facing outcomes are the goal.

---

## LCP — Largest Contentful Paint

**Measures:** loading experience — when the largest visible content element in
the viewport is painted.

**Good threshold:** ≤ 2.5 seconds (field / lab guidance; “needs improvement”
and “poor” bands sit above that).

### What can be the LCP element?

Common candidates:

- A large hero image or illustration
- A prominent heading / text block
- A main content image
- In app UIs: a large table, card stack, or primary content region once it paints

The LCP element is **whatever is largest in the viewport at the critical
moment**, not “whatever we think is most important.”

### Why the largest visible content matters

Users judge “is it loaded?” by the main content, not by a tiny spinner or a
header chrome. LCP approximates that judgment.

### What commonly hurts LCP

| Cause | Why it delays LCP |
|---|---|
| **Slow server / TTFB** | HTML arrives late → nothing can paint |
| **Render-blocking CSS/JS** | Browser waits before painting meaningful content |
| **Large / unoptimized images** | The LCP candidate itself is slow to download/decode |
| **Client-only rendering of main content** | User waits for JS + data before the big paint |
| **Font / late discovery** | Resource discovered late in the waterfall |

---

## INP — Interaction to Next Paint

**Measures:** responsiveness — from user input to the next visual update.

Covers:

- Click
- Tap
- Keyboard interaction

Pipeline roughly:

```text
Input → event handlers / main-thread work → style/layout → paint
```

**Good threshold:** ≤ 200ms.

### INP replaced FID

**FID** (First Input Delay) only measured delay until the **first** event
handler could run, and only for the first interaction. **INP** observes
interactions across the page lifecycle and focuses on the latency until the
**next paint**, which better matches “the UI felt stuck.”

### Why INP matters more than “first click only”

A page can feel fine on first click and then jank on every filter keystroke.
INP catches sustained sluggishness, not just startup delay.

### What commonly hurts INP

- Long tasks on the main thread (sync JS, heavy React renders)
- Large event handlers that do too much before yielding
- Unnecessary re-renders of big trees on each interaction
- Third-party scripts competing for the main thread

---

## CLS — Cumulative Layout Shift

**Measures:** visual stability — unexpected movement of visible content.

**Good threshold:** ≤ 0.1.

Layout shift score combines impact fraction and distance fraction. Many small
shifts or one large jump can both fail the budget.

### Classic CLS causes

- Image/video without reserved size → content pushed when media arrives
- Web font swap that reflows text
- Banner / toast injected above existing content
- Async data changing element height (empty → tall table)
- Skeleton / placeholder **size** that does not match final content

CLS is about **unexpected** shifts. User-initiated shifts (expanding an
accordion they clicked) are treated differently from content jumping on its own.

---

## Supporting metrics

### TTFB — Time to First Byte

How long until the first byte of the response. Useful when LCP is bad and you
suspect **server or network**, not front-end paint.

### FCP — First Contentful Paint

When the browser first paints *any* content (text, image, canvas). Earlier than
LCP usually. FCP can look fine while LCP is still poor (chrome painted; main
content late).

### TBT — Total Blocking Time

**Lab** metric: sum of time main-thread tasks block beyond a threshold after
FCP. Useful proxy when hunting jank causes. **Not** the same as INP.

---

## Outcome vs diagnostic

```text
LCP / INP / CLS
→ user-facing outcome metrics (Core Web Vitals)

TTFB / FCP / TBT
→ diagnostic / supporting metrics
```

Optimize for outcomes. Use diagnostics to find *why*.

---

## Verification

Without looking at docs, answer from the user’s perspective only:

| Vital | User experience word |
|---|---|
| LCP | Loading |
| INP | Responsiveness |
| CLS | Visual stability |

If the answer is “memoization” or “bundle size,” the mental model slipped back
to implementation.

---

## Key insight

Core Web Vitals measure **outcomes** experienced by users.

Do not begin with:

> What React optimization can I add?

Begin with:

> What user experience problem am I measuring?

App-specific predictions for Testing Lab live in
[`4-1-invoices-performance-hypothesis.md`](./4-1-invoices-performance-hypothesis.md).
No measurement numbers yet — that is Item 2.
