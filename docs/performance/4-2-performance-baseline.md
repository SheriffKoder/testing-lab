# Performance Baseline — `/invoices`

> Phase 4 · Item 2 · Build.
>
> Concepts:
> [`4-2-performance-measurement-tools.md`](./4-2-performance-measurement-tools.md).
>
> Hypotheses under test:
> [`4-1-invoices-performance-hypothesis.md`](./4-1-invoices-performance-hypothesis.md).

**Measure and triage only — no app code changes in this item.**

---

## Context

| Field | Value |
|---|---|
| Primary URL | `/invoices` (navigated from `/` for local Performance notes) |
| Environment | local `next dev` (not production) |
| Date | 2026-09-15 |
| Browser | Chrome (version not recorded) |
| Machine | local (not recorded) |
| Throttling | Lighthouse defaults (yes) |
| Load style | Lighthouse navigation runs (tool-managed; treat as cold-ish lab loads) |
| PSI / CrUX | Skipped — no public URL |

---

## Results table

Lighthouse **≥2 runs** per form factor. Ranges below; per-run detail follows.

| Metric | Mobile (run range) | Desktop (run range) | Notes |
| --- | ---: | ---: | --- |
| Perf score | 77 – 77 | ~97 (pass 2; pass 1 not recorded) | Pass 2 desktop = 97; mobile stable at 77 |
| LCP | 6.6 s – 6.6 s | 1.3 s – 1.3 s | Mobile lab LCP is the standout problem |
| CLS | 0 – 0 | 0 – 0 | Good in lab |
| TBT | 70 ms – 70 ms | 0 ms – 0 ms | Responsiveness *proxy* only — not INP |
| FCP | 0.9 s – 0.9 s | 0.2 s – 0.2 s | Stable |
| Speed Index | 1.0 s – 2.1 s | 0.4 s – 0.5 s | Mobile variance between passes |
| TTFB | ~50 ms | ~60 ms | Low — not the 6.6 s story |
| INP | n/a (Lighthouse) | n/a (Lighthouse) | Passive load does not measure INP |

### Lighthouse — mobile

| Metric | Pass 1 | Pass 2 |
| --- | ---: | ---: |
| Perf score | 77 (implied; “still 77” on pass 2) | 77 |
| FCP | 0.9 s | 0.9 s |
| LCP | 6.6 s | 6.6 s |
| TBT | 70 ms | 70 ms |
| CLS | 0 | 0 |
| Speed Index | 2.1 s | 1.0 s |
| TTFB | 50 ms | ~50 ms (“same TTFB”) |

LCP subparts recorded (pass 1): **TTFB 50 ms**, **element render delay 470 ms**. Other LCP phases (resource load delay / duration) not pasted — together they must explain most of the **6.6 s** LCP given low TTFB.

### Lighthouse diagnostics — mobile (analysis panel)

#### Long main-thread task

| URL | Start time | Duration |
|---|---:|---:|
| `…/node_modules_next_dist_compiled_react-dom_….js` | **6,309 ms** | **118 ms** |

- One long task; duration ≈ **118 ms** → portion over 50 ms ≈ **68 ms**, which lines up with reported **TBT 70 ms**.
- Start at **~6.3 s** sits next to mobile **LCP 6.6 s** — client `react-dom` work in the LCP window, not early boot.

#### User Timing (Next.js prerender / mount marks)

Early shell is cheap; the expensive prerender slice is the invoices data section:

| Mark | Duration | Note |
|---|---:|---|
| `InvoicesPage` [Prerender] | **471.54 ms** | Almost entirely the section below |
| `InvoicesSection` [Prerender] | **469.89 ms** | Data boundary under Suspense |
| `await` (inside section) | **455.09 ms** | Dominant cost — almost certainly `listInvoices` / Supabase wait |
| `await cookies` | 3.26 ms | Negligible |
| `InvoicesPageHeader` / skeleton / buttons | < 1 ms each | Shell is not the bottleneck |
| `InvoicesTable` (Mount) | **7.60 ms** @ ~487 ms | Table paint work itself is cheap once data exists |

**Reading:** server/prerender path spends ~**0.45 s** waiting inside `InvoicesSection`, then mounts a cheap table. That supports “query/await delays content,” but **does not alone equal 6.6 s LCP** — the remaining gap is lab throttling + later client work (see long task at 6.3 s) + whatever else Lighthouse attributes to LCP resource/render delay. Item 3 should separate **data await** vs **late client main-thread** rather than treating them as one knob.

“User Timing marks and measures” / “consider instrumenting” is advisory noise for this lab — Next already emitted useful marks.

### Lighthouse — desktop

| Metric | Pass 1 | Pass 2 |
| --- | ---: | ---: |
| Perf score | (not recorded) | 97 |
| FCP | 0.2 s | 0.2 s |
| LCP | 1.3 s | 1.3 s |
| TBT | 0 ms | 0 ms |
| CLS | 0 | 0 |
| Speed Index | 0.5 s | 0.4 s |
| TTFB | 60 ms | (not re-stated) |

LCP subparts recorded (pass 1): **TTFB 60 ms**, **element render delay 850 ms**.

---

## DevTools notes (spot-check)

### Pass A — soft navigation (home → invoices)

- **LCP 0.14 s** — element `p.mt-1.text-sm.text-muted-foreground` (muted invoices subtitle).
- **CLS 0.00** — worst cluster: 1 shift (negligible).
- **INP 24 ms** — interaction type `pointer` (good).

### Pass B — Performance + Network, mobile Device Mode

- **LCP 0.50 s** — element `span.font-medium.text-foreground` (likely table cell text).
- Network (~1.0–1.2 s, Fast 4G): small **304** script chunks (~0.3 kB, ~170 ms), **Turbopack / webpack-hmr** client scripts, HMR websocket **Pending**, favicon.
- No multi-second **product** request in that window. HMR **Pending** is normal for `next dev`, not an LCP smoking gun.

### Reconciliation — Lighthouse vs Performance

| Lens | Mobile LCP | Role |
|---|---:|---|
| Lighthouse (`next dev`, default mobile throttle) | **6.6 s** | Flags / compares under a harsh lab preset |
| Performance panel (Device Mode / soft path) | **0.14–0.50 s** | Names LCP element; explains the timeline |
| Network (same soft mobile session) | — | Shows wire activity; here mostly **dev HMR**, not app data |

**Method lesson (Item 2):** use both. Lighthouse alone can overstate pain on `next dev`; Performance alone can miss the harsh-lab failure mode. Neither is field truth (CrUX/RUM).

**Product reading:** the proven **app** cost remains `InvoicesSection` **`await` ~455 ms**. Most of the **6.6 s** Lighthouse gap was **not** reproduced as a product-network stall in Performance/Network — treat it as **lab + `next dev` ceiling** until re-checked on `next start` / production. Do not optimize as if users see a 6.6 s LCP.

---

## Hypothesis check (vs Item 1)

| Item 1 prediction | Verdict | One line |
|---|---|---|
| Header / subtitle can win LCP before table (slow fetch) | **Supported** (some paths) | Soft nav LCP was muted header `p`. |
| Table is most likely LCP on typical seeded list | **Supported** (other paths) | Mobile Device Mode LCP was `span.font-medium.text-foreground` (table-like text). LCP winner is **path-dependent**. |
| Slow TTFB / query latency can push LCP past 2.5 s | **Supported (query/await); TTFB not the issue** | **TTFB ~50 ms**. User Timing: section **`await` ~455 ms**. Lighthouse **6.6 s** is mostly unexplained by that await alone and not matched by soft Performance. |
| Skeleton → table height mismatch → CLS | **Contradicted** (this session) | CLS **0** on all Lighthouse + local runs. Skeleton marks are tiny; table mount is 7.6 ms. |
| Font swap / ThemeSwitcher CLS | **Unclear** | No material CLS observed; cannot confirm or refute tiny shifts. |
| List page INP risk low; TBT as proxy | **Supported** | Local INP 24 ms; one **118 ms** `react-dom` task ≈ TBT 70 ms — modest, not alarming. |
| No content images → image audits are noise | **Supported** | No image-heavy findings in the captured opportunity set. |

---

## Recommendation triage

From Lighthouse opportunities / diagnostics captured on mobile pass 1 (and stable metrics thereafter):

### Likely meaningful

- **`InvoicesSection` prerender `await` ~455 ms** — confirmed data-wait on the critical invoices path (User Timing). Best **app-owned** lead for Item 3.
- **LCP element is path-dependent** (header `p` vs table `span`) — any LCP fix must re-check which node wins under the same conditions.
- **Element render delay** (470 ms mobile / 850 ms desktop in Lighthouse LCP breakdown) — same order of magnitude as the section await on mobile.

### Possibly meaningful

- **Late `react-dom` long task** (start **6,309 ms**, **118 ms** in Lighthouse) — explains lab **TBT ~70 ms**; secondary unless production traces show the same.
- **Render-blocking CSS** (~7.3 KiB, est. ~140 ms) — real but small vs. the Lighthouse 6.6 s headline.
- **Legacy JavaScript** (est. ~9 KiB) — small transfer win; verify relevance before chasing.
- **Re-baseline on `next start` / production** — decide how much of Lighthouse **6.6 s** was `next dev` + harsh lab, not product reality.

### Noise / not relevant to this app

- Treating Lighthouse mobile **6.6 s** on `next dev` as the user-facing LCP without a Performance cross-check (and ideally a production build).
- Dev Network noise: **webpack-hmr / Turbopack HMR** websocket **Pending**, tiny HMR client 304s.
- “Consider instrumenting with User Timing” — Next already emitted the useful marks above.
- SEO / Best Practices chase for Phase 4 Performance goals.
- Image format / oversized-image work — no content images on this route.
- Treating **TBT** as **INP**.
- Chasing header/skeleton prerender times — they are sub-millisecond to low-ms.

---

## Variance note

- Mobile **LCP / FCP / TBT / CLS / score** matched across Lighthouse passes (6.6 s / 0.9 s / 70 ms / 0 / 77) — unusually stable for lab.
- Mobile **Speed Index** moved **2.1 s → 1.0 s** between passes — expected lab jitter; do not overfit to either SI number.
- Desktop metrics nearly identical across passes (LCP stuck at 1.3 s).
- **Cross-tool variance is the main story:** Lighthouse mobile LCP **6.6 s** vs Performance **0.14–0.50 s**. Same app, different lenses. Soft Performance LCP element also flipped (header `p` → table `span`). Record ranges and method; do not pretend one number is “the” LCP.

---

## Explicit non-goals

```text
No fixes in this item. Item 3+ owns LCP/CLS/INP-oriented changes.
```

No application code was changed for performance during this measurement session.

---

## PSI / CrUX

```text
No public URL / no CrUX.
```

---

## Hand-off for Item 3

```text
Next (Item 3): pick the strongest LCP-related finding from “Likely meaningful”
(or the hypothesis that survived measurement) and optimize with before/after
numbers — still one concern at a time.

Strongest app-owned lead: InvoicesSection await ~455 ms (not TTFB; not HMR).

Evidence stack for Item 3 (one concern at a time):
1. Prefer a production/`next start` Lighthouse + Performance pair before big
   optimizations — confirm how much of 6.6 s was next dev lab noise.
2. Fix or bound the list data await if LCP still depends on InvoicesSection.
3. Re-identify LCP element under the same conditions after each change
   (header vs table text has already flipped between runs).
4. Only then chase late react-dom / small CSS/legacy-JS opportunities.

Do not “make TTFB faster” — it is already ~50–60 ms.
Do not chase webpack-hmr Pending as an LCP bug.
```

