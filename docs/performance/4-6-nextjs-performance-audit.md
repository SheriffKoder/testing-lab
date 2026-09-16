# Next.js Performance Audit — `/invoices`

> Phase 4 · Item 6 · Build / audit.
>
> Concepts:
> [`4-6-nextjs-performance.md`](./4-6-nextjs-performance.md).
>
> Steps 2–4 complete: tree mapped, Network baseline recorded, **Option A
> (document-only)** — no code change.

## Context

| Field | Value |
|---|---|
| Primary URL | `/invoices` (also `/invoices/new` for create island) |
| Date | 2026-09-16 |
| Env | Production-like (`next start`) Network baseline + code map |
| Item 5 search island | **None** (concepts-only Item 5) |

---

## Component / boundary map

```text
app/layout.tsx                          Server  + next/font (Geist) + ThemeProvider (client lib)
└── children

app/invoices/page.tsx                   Server  (shell)
├── InvoicesPageHeader                  Server  (Link + Button; no "use client")
└── Suspense
    ├── fallback: InvoicesTableSkeleton Server  (presentational)
    └── InvoicesSection                 Server  async  ← awaits listInvoices()
        └── InvoicesTable               Server  (presentational; no handlers)

app/invoices/loading.tsx                Server  (route navigation fallback)
├── InvoicesPageHeader
└── InvoicesTableSkeleton

app/invoices/error.tsx                  Client  ("use client" — Next requirement)
└── retry Button

app/invoices/new/page.tsx               Server  (thin shell)
└── CreateInvoiceView                   Client  ("use client")
    └── CreateInvoiceForm               Client  ("use client")
         └── createInvoiceAction        Server Action ("use server")
```

### Server vs Client (files that matter)

| Unit | Role | Boundary |
|---|---|---|
| `app/invoices/page.tsx` | Route shell | **Server** |
| `app/invoices/loading.tsx` | Route loading UI | **Server** |
| `app/invoices/error.tsx` | Segment error UI + `reset` | **Client** (required) |
| `app/invoices/new/page.tsx` | Create route shell | **Server** |
| `views/invoices/ui/invoices-page-header.tsx` | Title + Create link | **Server** |
| `views/invoices/ui/invoices-table-skeleton.tsx` | List placeholder | **Server** |
| `views/invoices/ui/invoices-section.tsx` | `await listInvoices()` | **Server** (async RSC) |
| `views/invoices/ui/invoices-table.tsx` | Pure table / empty state | **Server** (no `"use client"`) |
| `views/invoices/ui/create-invoice-view.tsx` | Router + action wiring | **Client** |
| `features/create-invoice/ui/create-invoice-form.tsx` | Form state / validation | **Client** |
| `features/create-invoice/server/create-invoice-action.ts` | Persist + `updateTag` | **Server Action** |
| `entities/invoice/queries/list-invoices.ts` | Supabase list + cache | **Server** (module) |
| `components/theme-switcher.tsx` | Theme UI | **Client** — used on **`/` only**, not `/invoices` |

Barrel split: client-safe exports via `@/views/invoices`; server-only
`InvoicesSection` via `@/views/invoices/server` — keeps create route from
pulling the list fetch into a client graph.

---

## Fetching / Suspense / cache

| Concern | How `/invoices` does it |
|---|---|
| Who fetches | `InvoicesSection` → `listInvoices()` (`entities/invoice`) |
| Client list fetch? | **No** — data arrives with RSC; table is presentational |
| Cache | `unstable_cache(..., { revalidate: 120, tags: ["invoices"] })` via cookie-free `createPublicServerClient` (Item 3) |
| Invalidation | `updateTag(INVOICES_CACHE_TAG)` after `createInvoiceAction` |
| Suspense (page) | Wraps `InvoicesSection`; fallback `InvoicesTableSkeleton` — shell/header can paint while list awaits |
| Route `loading.tsx` | Same header + skeleton on segment navigation |
| Waterfall on list page | Single list query inside the boundary — **no** A-then-B server fetch chain on this route |
| Create path | Client submit → server action → DB write → tag bust → `router.refresh` / navigate (post-interaction; Item 5 surface) |

Note: `page.tsx` comment still mentions cookies on `listInvoices`; the query now
uses the public server client inside `unstable_cache` (no `cookies()`).

---

## Fonts / images

| Concern | Finding |
|---|---|
| Fonts | Root `app/layout.tsx`: `next/font` Geist, `display: "swap"` |
| Content images | **None** on `/invoices` / `/invoices/new` — no `next/image` LCP path |
| Theme | `ThemeProvider` in root layout; `ThemeSwitcher` only on home |

---

## Findings (preliminary — Step 2)

**What’s fine**

- List path is server-first: fetch + table stay off the client bundle.
- `"use client"` is pushed to create flow (and home theme), not the whole
  `/invoices` page.
- Suspense + `loading.tsx` give a real streaming / perceived-performance slot.
- One list fetch; Item 3 cache already addresses repeated server await cost.
- No heavy optional chart/editor always loaded on the list route.

**What’s costly / watch**

- Create route: page shell is Server, but the **entire body** is one Client view
  that owns the form — justified by interaction; not an accidental high boundary
  on the **list** page.
- `error.tsx` must be Client — small, expected.
- Stale comment on cookies in `page.tsx` (docs accuracy only).
- No Item 5 filter island — nothing extra to audit there.

**Obvious unnecessary client work on `/invoices` list?** Not from this map.
Step 3 Network weight (~167 kB / 10 JS requests) is in the normal Next App
Router range for a small route — **not** a signal of an accidental huge client
tree on the list.

**Step 4 decision: Option A (document-only).** No code change.

---

## Change made

**None.** Audit + concepts only. Boundaries already match the lesson (server list,
client create island, Suspense + cache).

---

## Before / after

### Before (Step 3 baseline)

| Signal | `/invoices` |
|---|---|
| Method | Chrome DevTools → Network → JS (production-like serve) |
| JS requests | **10** |
| JS transferred | **167 kB** |
| Reading | Consistent with framework runtime + small route chunks; list stays server-rendered. No unexpected multi‑MB client weight. |

### After

n/a — document-only; no architectural change; no delta to claim.

---

## Why browser work improved (or why no change)

No change: client JS is already limited to create/error islands; list fetch is
RSC + Item 3 cache; Suspense/`loading.tsx` already stream the list slot.
Baseline **10 requests / 167 kB** documents current weight rather than a fix.

Verification answer:

> What browser work did this remove or improve?

Nothing in this item — the architecture was already doing the right browser-side
work; we recorded that instead of rearranging folders.

---

## Explicit non-goals

- Reverting Item 3 list cache
- CLS skeleton pixel-matching (Item 4 skipped)
- Controlled INP filter demo (Item 5 docs-only)
- Moving create form to Server Components (would break interaction)
- RUM / LHCI (Items 7–8)

---

## Hand-off

Next (Item 7): Real User Monitoring and field performance — lab vs RUM,
`web-vitals` / reporting concepts, 75th percentile thinking. Do not rip out
list cache or Suspense boundaries; wire measurement around the app as it stands.

