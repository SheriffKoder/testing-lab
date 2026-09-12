# Playwright Network Control and Mocking

> Phase 2 · Item 7 · Concepts + project wiring.
>
> Builds on [`2-5-playwright-waiting.md`](./2-5-playwright-waiting.md) and
> [`2-6-playwright-test-isolation.md`](./2-6-playwright-test-isolation.md).
>
> Next: debugging, test strategy, and Cypress awareness — Item 8.

Item 5 used `page.route` narrowly (delay / abort) so loading and create-failure
could be asserted. Item 7 is the **curriculum**: when to stay on the real
backend, when to intercept, and what Playwright can actually see in this app.

The phase goal:

> Network mocking is most valuable for states that are expensive, unreliable, or
> difficult to produce naturally. Keep some tests real.

---

## Real backend vs mocked backend

**Real integration** (this lab’s create-success journey):

```text
Browser → Next.js (server action / RSC) → Supabase
```

You prove the stack works: RLS, mapping, refresh, list row. Cost: needs a live
DB, can flake on network, leaves `tl_pw_*` rows.

**Controlled browser test**:

```text
Browser → Playwright intercepts the request → fake / delayed / aborted response
```

You prove the **UI contract** for a state you cannot (or should not) produce in
Supabase: 500, empty list, 3s latency. Cost: you no longer prove the backend.

Both are E2E in the sense of “real browser.” Only the first is end-to-end
**through** the data store.

---

## Network interception (`page.route`)

`page.route(url, handler)` registers a hook for matching browser requests.

```ts
await page.route("**/invoices/new", async (route) => {
  const request = route.request();
  // inspect method / headers, then:
  await route.continue(); // pass through (optionally after a delay)
  // await route.abort("failed");
  // await route.fulfill({ status: 500, body: "…" });
});
```

Playwright sees **browser** traffic only. Server-side `listInvoices()` (RSC →
Supabase) never appears as a `fetch` in the page. Intercepting “the invoices
request” only works if that request is made **from the browser**.

---

## Mock responses, errors, slow networks

| Technique | Typical use |
|---|---|
| `route.continue()` after `setTimeout` | Make loading UI observable (Item 5) |
| `route.abort("failed")` | Network failure; no response body |
| `route.fulfill({ status, body, contentType })` | Fake JSON / HTML / 500 without hitting the origin |

**Slow:** delay inside the handler, then continue or fulfill. Still assert UI
state — do not `waitForTimeout` in the test body.

**Error:** abort or fulfill 5xx. Assert `role="alert"` (or route `error.tsx`)
and that the app does not crash.

**Empty:** fulfill an empty list payload. Only possible if the list is loaded
via a browser-visible request.

---

## Frontend independently of backend availability

Controlled tests let CI assert error / empty / slow **without** changing
Supabase, emptying the table, or taking the API down.

That independence is the point — and the tradeoff: a green mocked test can hide
a broken RLS policy or a wrong insert column. That is why at least one core
journey stays real.

---

## Realism vs determinism

| | Real backend | Intercepted |
|---|---|---|
| Proves | Stack integration | UI under a chosen network story |
| Determinism | Depends on DB / RLS / latency | You choose status, body, delay |
| Isolation | Unique `tl_pw_*` rows (Item 6) | Often no write at all |
| Flake risk | Higher (network, data) | Lower (if the intercept matches) |

Do **not** mock every E2E. A fully mocked suite is a slower RTL suite that
never checks the wire you care about.

---

## Why not every E2E should mock

Mock when the state is:

- hard to produce (empty production-like DB, 500 from Supabase)
- unsafe to produce (deleting shared data)
- needed for a **loading** assertion (delay)

Keep real when the question is:

> Can a user create an invoice and see it persist?

---

## What this app can intercept

| Request | Visible to `page.route`? | Used today |
|---|---|---|
| Create server-action POST to `/invoices/new` (`next-action` header) | Yes | Item 5 delay + abort |
| `listInvoices` / Supabase from `InvoicesSection` (RSC) | **No** | Jest mocks `listInvoices` (Phase 1 Item 6) |
| Navigation document / RSC flight for `/invoices` | Technically yes | Fragile; do not fake an empty table this way |

Overview Build examples (intercept “invoices request” → empty / list error /
retry) assume a **client fetch**. This lab lists invoices on the server.
**Do not** add a client fetcher or API route just to demo `page.route`.

List empty / reject / retry stay **Jest + RTL**. Playwright owns create
loading + create network failure + one real persist journey.

---

## Item 5 vs Item 7

Item 5: wait on UI; `page.route` was a **hook** to make states visible.

Item 7: name the techniques, split **real** vs **controlled** tests, extract
small helpers if the route logic repeats, document the SSR limit.

---

## In this project

| Piece | Value |
|---|---|
| Spec | `tests/e2e/create-invoice.spec.ts` |
| Real persist | `describe("real persist")` — delay + `continue()`; row on `/invoices` is a real insert |
| Controlled failure | `describe("controlled network failure")` — `abort("failed")`; alert + fields kept; no DB write |
| Interceptable request | POST `/invoices/new` with `next-action` header |
| Not interceptable | `listInvoices` (RSC → Supabase) |
| `fulfill` | **Skipped** — Next server-action bodies are a special protocol; abort already produces the user-visible alert |
| List empty / 500 / retry | **Not** Playwright. Jest owns `InvoicesSection` and `/invoices` `error.tsx` |
| Helper extract | Skipped — `isServerActionPost` lives once in the spec |
| No `waitForTimeout` | Delay stays inside the success route handler |

### Why not a fully mocked “create + see row”

After submit, `/invoices` HTML comes from the server. A `fulfill` of the create
POST cannot honestly put a row in that table. The success test must stay real.

### Why list empty / 500 stay in Jest

`page.route` never sees `listInvoices`. Faking the document/RSC flight for
`/invoices` is fragile. Emptying the real table to force empty state would
break other tests. Phase 1 already covers those contracts.

### How to run

```bash
npx playwright test tests/e2e/create-invoice.spec.ts
npm run test:e2e
npm test
```

Oral check: when should this suite use the real backend, and when should it
intercept?

- **Real** — “Can a user create an invoice and see it persist?”
- **Controlled** — “What does the form do when the network fails?” (without
  changing Supabase)

---

## Key Insight

Intercept what the browser actually sends.

Keep one test on the real stack. Mock the stories you cannot cheaply produce
in Supabase.
