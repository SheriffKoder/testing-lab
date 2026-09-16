# LCP Optimization

> Phase 4 · Item 3 · Concepts / explanation.
>
> Companion experiment (before / after / why):
> [`4-3-lcp-experiment.md`](./4-3-lcp-experiment.md)
> (created in later plan steps — Build).
>
> Builds on:
> [`4-2-performance-baseline.md`](./4-2-performance-baseline.md),
> [`4-1-core-web-vitals-mental-model.md`](./4-1-core-web-vitals-mental-model.md).

Item 1 defined the metrics. Item 2 measured `/invoices` and triaged findings.

Item 3 answers:

> Can we improve **LCP** by fixing the actual LCP element’s delivery path —
> and prove it with before/after numbers?

This item **does** change the app when justified (or introduces one controlled
LCP regression first). Still **one concern at a time**. Do not turn Phase 4 into
a blanket image/JS cleanup sprint.

---

## LCP delivery path

Poor LCP is rarely “the page is slow” in the abstract. Something in this chain
is late:

```text
Server / TTFB
↓
Resource discovery
↓
Resource download
↓
Rendering
```

| Stage | What goes wrong |
|---|---|
| Server / TTFB | Origin/edge slow; HTML starts late |
| Resource discovery | Critical asset found only after JS/CSS runs or late HTML |
| Resource download | Large / unoptimized / contended bandwidth |
| Rendering | Main thread busy; fonts; render-blocking CSS; content swapped in late |

Optimize the stage that owns **your** LCP element — not every stage on every page.

---

## Common causes

- Slow server response (classic TTFB)
- Request **waterfalls** (A must finish before B is discovered)
- Large images / wrong dimensions / wrong format
- **Client-side fetch** of critical above-the-fold content
- Render-blocking CSS
- JavaScript delaying first paint of the LCP node
- Fonts delaying text LCP candidates
- Hero / background images discovered late
- Loading UI that **replaces** important content instead of reserving it

**This lab (from Item 2):** TTFB was already fine (~50–60 ms). The proven
**app-owned** cost was `InvoicesSection` prerender **`await` ~455 ms**.
Lighthouse mobile **6.6 s** on `next dev` did **not** match soft Performance
(**~0.14–0.50 s**). Prefer `next start` / production-like runs before declaring
victory on huge lab gaps. Do not chase webpack-hmr. Full tables live in the
[baseline](./4-2-performance-baseline.md) — not repeated here.

---

## Images (even when this app has few)

Teach these even if the invoices UI has little or no content media — the
experiment may use a controlled above-the-fold image, or stay on the data path.

| Topic | Why it matters for LCP |
|---|---|
| `next/image` | Optimization, sizing, and modern formats with less manual plumbing |
| Width / height (or aspect-ratio) | Reserves space (also CLS); helps the browser plan layout early |
| Responsive images + `sizes` | Avoid downloading a desktop-sized file for a mobile LCP slot |
| Formats / optimization | Smaller bytes on the **download** stage |
| Above-the-fold vs below | Only the LCP candidate (usually above-the-fold) moves LCP |
| `priority` / `fetchPriority` | Discover and fetch the likely LCP image sooner |
| Lazy-loading the LCP image | **Hurts** LCP — delays discovery/download of the very element you need |
| Optimizing below-the-fold images | Often **no LCP win** — good hygiene, wrong lever for this metric |

If there are still **no** content images on `/invoices`, do not pretend empty
“serve images in next-gen formats” audits are the product issue. Use a
**controlled** LCP image regression → fix, or stay on the real data-await lead.

---

## Server rendering vs client waterfalls

```text
Browser requests page
↓
Server waits (data / auth / etc.)
↓
HTML arrives
↓
Browser discovers important content
```

vs

```text
Browser receives useful HTML early
↓
Critical content can render sooner
```

Client-side fetching of **initial** critical content often creates:

```text
HTML shell → JS download → JS run → fetch → render LCP
```

That waterfall is a frequent LCP killer: each step blocks the next, and the
above-the-fold node cannot paint until the end.

Server Components / server data for the **first paint** are the usual fix
direction in this Next.js app — measure before rewriting architecture for its
own sake. (Secondary / user-driven fetches after first paint are a different
story.)

---

## Build (conceptual)

1. Identify the **current LCP element** (Lighthouse + Performance), same URL
   and environment you will use for after.
2. Prefer **`next start`** (or preview) for before/after claims.
3. If LCP is already excellent in a production-like run, introduce **one**
   controlled regression (oversized image, delayed critical content,
   unnecessary client fetch, late discovery).
4. Measure **before**.
5. Fix **that** path only (`next/image`, server render, priority/preload where
   justified, remove waterfall, shrink the critical resource).
6. Measure **after**. Record in
   [`4-3-lcp-experiment.md`](./4-3-lcp-experiment.md):

```text
Before
After
Why it changed
```

Starting lead from Item 2: improve or bound the list **data await** if LCP
depends on `InvoicesSection`; otherwise pick one controlled knob. One concern
only.

---

## Verification

Do not stop because the overall Performance **score** moved.

```text
Did LCP improve?
```

Explain why (element + stage in the delivery path). Re-check the LCP element —
Item 2 showed it can flip between header text and table text.

---

## Key Insight

Optimize the **actual LCP element** and its delivery path.

Do not blindly optimize every image (or every Lighthouse opportunity) because
the report mentioned it.
