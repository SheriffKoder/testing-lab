# Next.js Performance Architecture

> Phase 4 · Item 6 · Concepts / explanation.
>
> Companion audit (route map + optional change):
> [`4-6-nextjs-performance-audit.md`](./4-6-nextjs-performance-audit.md)
> (created in later plan steps — Build).
>
> Builds on:
> [`4-3-lcp-optimization.md`](./4-3-lcp-optimization.md),
> [`4-3-lcp-experiment.md`](./4-3-lcp-experiment.md),
> [`4-5-inp-and-interactivity.md`](./4-5-inp-and-interactivity.md).

Items 3–5 optimize **what the browser experiences** (paint, shift, interaction).

Item 6 answers:

> How do **Next.js / React architecture choices** change browser work — JS,
> hydration, waterfalls, streaming — and what (if anything) should change on
> `/invoices`?

This item may change boundaries or fetching when justified by measurement or
**obviously** unnecessary client work. It is an **audit + selective fix**, not a
rewrite of the feature-sliced tree.

---

## Why architecture shows up in Core Web Vitals

Framework choices matter because of what they change in the browser:

```text
Less JavaScript
Fewer waterfalls
Earlier content
Less hydration
Better resource loading
```

Do not accept “Server Components are faster” as a conclusion. Name **what
browser work** moved.

| Architecture move | Browser effect (examples) |
|---|---|
| Keep data UI as a Server Component | Less JS shipped; less hydration |
| Push `"use client"` down | Smaller interactive island; shell stays cheap |
| Suspense around a slow fetch | Shell can paint while data streams |
| Server fetch + cache | Fewer client round-trips; earlier LCP content (Item 3) |
| Dynamic-import optional heavy UI | Less initial JS on first paint |

---

## Server Components

Conceptually:

```text
Server Component
→ code can remain on server
→ less JavaScript sent to browser
```

The component can fetch and render on the server. Its implementation stays out of
the client bundle unless a Client Component boundary pulls it across (or you
pass non-serializable values incorrectly — out of scope here).

Compare with an unnecessary **high** `"use client"` that forces a large subtree
into the client bundle and hydration.

Making a large subtree client-side can increase:

- JavaScript download / parse / compile
- Hydration cost
- Ongoing browser work on updates

Server Components are a performance tool when they **remove** work from the
browser — not when they only change file location.

---

## Client Components

Required when you need:

- Event handlers
- Browser APIs
- Interactive local state
- Client-only hooks

The lesson is **not**:

> Client Components are bad.

The lesson is:

> Client-side JavaScript has a runtime cost, so ship it where interaction
> requires it.

Push `"use client"` **down** to the smallest interactive leaf when practical.
A page that is mostly static with one form and one theme toggle should not make
the whole route tree a client component “for convenience.”

**This lab (preview — confirm in audit):** create flow and theme switcher are
client islands; the invoices list path is mostly server-driven with Suspense.

---

## Streaming / Suspense

### Streaming

Instead of waiting for every async piece before sending anything useful, the
framework can **stream** HTML / RSC payload progressively: shell first, slow
slots later.

### Suspense boundaries

A `<Suspense fallback={…}>` marks a slot that may resolve later. While the child
is pending, the fallback renders; when ready, the real UI replaces it.

```text
Page shell (header, layout)
↓
Suspense boundary
  → fallback (skeleton) paints early
  → async child (list fetch) resolves later
↓
Rest of the page is not forced to wait on that one request
```

### Why this helps perceived performance

- One slow request should not necessarily block the **entire** page shell.
- Loading UI shows structure early → users see progress instead of a blank page.
- Ties to LCP: if the LCP element is **inside** the slow slot, streaming alone
  does not make that element early — it only lets **other** content appear first
  (Item 3 lesson: data-dependent LCP still waits on the fetch/cache).

### Layout caution (CLS)

Poor boundary placement or a tiny spinner replaced by a tall table can still
cause layout issues. Reserve approximate space in the fallback (Item 4
concepts). This lab’s `InvoicesTableSkeleton` is the fallback for
`InvoicesSection`; usefulness is “does the shell paint while list awaits?” —
not “do we have a Suspense checkbox?”

**This lab:** `app/invoices/page.tsx` wraps the list in Suspense;
`app/invoices/loading.tsx` covers route-level navigation with the same header +
skeleton pattern.

---

## Data fetching

Performance implications (not a full Next.js API manual):

### Waterfalls

```text
await A
then start B
→ total ≈ time(A) + time(B)
```

Independent work should start together when possible:

```text
await Promise.all([A, B])
→ total ≈ max(time(A), time(B))
```

### Server-side vs client waterfalls

| Pattern | Typical browser cost |
|---|---|
| Fetch in a Server Component | Work on server; HTML/RSC can include data; less client waiting after load |
| Fetch after hydration in a Client Component | Extra round-trip; blank/skeleton until JS runs + request finishes |
| Nested client fetches (A then B in effects) | Classic waterfall; late content |

### Caching

Caching shortens repeated server work so streamed/list content can resolve
sooner. Item 3 wrapped `listInvoices` in `unstable_cache` (2 min + tag
invalidation on create) and improved Lighthouse mobile LCP. Architecture docs
**explain** that lever; the audit should not casually revert it.

### Static vs dynamic (conceptual)

- More static / cached output → less work per request, earlier bytes when warm.
- Fully dynamic per-request work → fresher data, often higher TTFB / await cost.

Focus on: **earlier content**, **fewer round-trips**, **less client waiting** —
not memorizing every Next cache API.

---

## Code splitting

- **Route-level splitting** — App Router loads JS for the route you navigate to,
  not the entire app at once.
- **`dynamic` / lazy imports** — heavy optional UI (charts, editors, rare modals)
  can load only when needed.
- **Optional dependencies** — keep large libraries off the critical first paint
  path when the feature is unused on first view.

Deferring a heavy client island reduces **initial** JS. Do not split everything
— only where cost is real or obviously optional.

---

## This lab (starting picture)

Confirm in the audit; do not treat as frozen:

| Area | Likely shape |
|---|---|
| `/invoices` page | Thin `app/` shell; composition in `views/invoices` |
| List data | Server fetch via entity query; Item 3 `unstable_cache` |
| Interactive islands | Create flow (`"use client"`), theme switcher; no Item 5 search island |
| Images / fonts | Few/no content images; `next/font` (Geist) in root layout |

---

## What the audit will ask (next steps)

- Which components are Server vs Client?
- Where are `"use client"` boundaries?
- What JavaScript is actually necessary?
- Are large components interactive unnecessarily?
- Are requests sequential unnecessarily?
- Could optional functionality load later?
- Are Suspense boundaries useful?
- Are images/fonts using Next.js features appropriately?

For every architectural **change**, answer:

> What browser work did this remove or improve?

---

## Key Insight

Learn the **underlying browser reason**, not only the Next.js API name.

Architecture is a performance tool when it reduces JS, waterfalls, late content,
or hydration — not when it only rearranges folders.

---

## Hand-off

Next plan step: map `/invoices` (and create flow if needed), run a production
build baseline, then write
[`4-6-nextjs-performance-audit.md`](./4-6-nextjs-performance-audit.md) —
change code only if measurement or obvious client bloat justifies it.
