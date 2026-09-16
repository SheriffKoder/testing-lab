# INP and Interactivity

> Phase 4 · Item 5 · Concepts / explanation.
>
> No controlled INP experiment in this lab — list has no sync filter today;
> Item 2 local INP was already good (~24 ms). Documentation only.
>
> Builds on:
> [`4-1-core-web-vitals-mental-model.md`](./4-1-core-web-vitals-mental-model.md),
> [`4-1-invoices-performance-hypothesis.md`](./4-1-invoices-performance-hypothesis.md),
> [`4-2-performance-baseline.md`](./4-2-performance-baseline.md).

Item 3 improved **load** paint (LCP). Item 4 owned **layout stability** (CLS) —
already ~0 here; skipped without a forced demo.

Item 5 answers:

> After the user interacts, how long until the next paint — and what would we
> do if it were slow?

---

## What an interaction is

INP cares about user inputs that start an interaction, for example:

- Click / tap
- Key press
- Other pointer / keyboard interactions the metric observes

It is **not** the same as “page finished loading.” Lighthouse’s passive load
scores **TBT** as a main-thread proxy — useful diagnostics, **not** INP.

---

## INP delivery path

```text
User clicks
↓
Browser must wait          ← input delay (main thread busy)
↓
Event handler runs         ← processing duration
↓
React updates              ← still processing (setState / render)
↓
Browser paints             ← rendering delay until next paint
```

Any slow stage makes the interaction feel delayed. INP roughly tracks latency
from interaction start to the next paint that reflects the update.

| Stage | What goes wrong |
|---|---|
| Input delay | Long tasks already on the main thread; hydration; other JS |
| Handler execution | Sync validation, filter/sort, heavy loops in the click/key path |
| React update | Large re-renders, state too high, cascading updates |
| Rendering / paint | Huge DOM diffs, layout thrash, style recalc on big trees |

Optimize the stage that owns **your** sluggish interaction — not every React API.

---

## Main thread, long tasks, and work

The **main thread** runs JS, style, layout, and often paint coordination.

- A **long task** (~50 ms+) blocks other work — including starting or finishing
  an interaction’s next paint.
- **JavaScript execution**, **DOM work**, and **rendering work** all compete on
  that thread.

INP problems are often **work problems**: too much happens synchronously after
the input.

---

## React-specific causes

- Large synchronous calculations in event handlers or render
- Rendering huge lists on every keystroke
- Excessive / cascading state updates
- State lifted too high → large subtrees re-render
- Expensive filtering / sorting on every input
- Unnecessary client JavaScript / large third-party libraries
- Hydration cost delaying early interactions

### Memoization (`useMemo`, `useCallback`, `memo`)

> Do not add them blindly.

Memoization can add complexity and still fail if the real cost is “we should not
do this work at all” (e.g. filter 10k rows sync on every key). Prefer **removing
or deferring work** first; memoize only when profiling shows a hot, stable
subtree or calculation that re-runs without need.

---

## Tools (use when relevant)

- Browser **Performance** panel (long tasks, main-thread timeline)
- **React DevTools Profiler** (which components re-rendered and why)
- React **transitions** / deferring non-urgent updates
- Splitting expensive work; pagination / virtualization for very large lists

Do **not** add these just to demonstrate them.

---

## This lab

| Surface | INP note |
|---|---|
| `/invoices` list | Presentational table — **no** sync search/filter. Real list INP risk is absent until that exists. |
| `/invoices/new` | Small form; sync validate on submit then server action + navigation. Medium risk on **post-success** work, not typing. |
| Item 2 local INP | ~24 ms on a pointer interaction (good). TBT was a separate load proxy. |

**Decision:** no code change and no controlled regression. Concepts only — same
spirit as skipping Item 4 when CLS was already 0.

If a future feature adds sync filter/sort over a large list, the playbook is:
profile the interaction → remove or defer work → re-measure (not sprinkle
`memo`).

---

## Key Insight

Before adding React optimization APIs, ask:

> Why is the browser doing so much work after this interaction?

**Removing work** is often better than optimizing unnecessary work.

---

## Hand-off

Next (Item 6): Next.js performance architecture — Server vs Client boundaries,
Suspense, data fetching, code splitting. Audit `/invoices`; change only what
measurements or obvious unnecessary client work justify.
