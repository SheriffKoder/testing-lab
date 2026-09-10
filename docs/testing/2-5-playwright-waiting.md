# Playwright Assertions and Auto-Waiting

> Phase 2 · Item 5 · Concepts + project wiring.
>
> Builds on [`2-4-e2e-user-journeys.md`](./2-4-e2e-user-journeys.md) and
> [`2-3-playwright-locators.md`](./2-3-playwright-locators.md).
>
> Next: fixtures and isolation — Item 6 (`2-6-playwright-test-isolation.md` when
> added).

Item 4 proved a create journey can finish. Item 5 is about **how Playwright waits**
so that journey (and loading/error variants) stay stable when the network or UI
is slow — without sleeping for a fixed number of milliseconds.

The phase goal:

> Never synchronize tests with time when you can synchronize them with
> application state.

---

## Playwright auto-waiting

Before an action (`click`, `fill`, …), Playwright **retries** until the locator
resolves to an element that is ready. You usually do not write:

```ts
await page.waitForSelector("…");
await button.click();
```

You write:

```ts
await page.getByRole("button", { name: "Create invoice" }).click();
```

Playwright waits for the locator to match, then for **actionability**, then
performs the action.

---

## Actionability checks

Roughly, before clicking Playwright expects the target to be:

- attached to the DOM
- visible
- stable (not animating away)
- enabled (not `disabled`)
- receiving events (not covered by another element)

If the submit button is briefly disabled while saving, a premature `click` would
fail or flake; auto-waiting (or asserting disabled, then asserting enabled again)
ties the test to **UI state**, not a guess about duration.

---

## Locator assertions

`expect(locator).…` assertions also **retry** until they pass or time out.

Common ones:

| Assertion | Meaning |
|---|---|
| `toBeVisible()` | Element is in the accessibility tree and visible |
| `toHaveText()` / `toContainText()` | Text content matches |
| `toHaveValue()` | Input/select value |
| `toHaveCount()` | How many matches (e.g. `0` for absence) |
| `toBeEnabled()` / `toBeDisabled()` | Interactive state |
| `toHaveURL()` | Page URL (used in Item 4 for route changes) |

Example:

```ts
await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
await expect(page.getByRole("row").filter({ hasText: customer })).toBeVisible();
```

---

## Why Playwright retries assertions

The UI is asynchronous: navigation, RSC refresh, network, React render. A single
check at time `t` may fail even when the app is correct a moment later.

Retrying `expect(locator).toBeVisible()` until timeout turns “wait for the row”
into the assertion itself — no separate sleep.

---

## Why arbitrary sleeps are dangerous

```ts
await page.waitForTimeout(2000); // bad default
```

Problems:

1. **Too short on CI** → flake when the machine is slow.
2. **Too long locally** → suite crawls.
3. **Hides races** — you did not name the condition you care about.
4. **Breaks when speed changes** — faster app still waits 2s; slower app still flakes.

Prefer:

```ts
await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
```

or waiting for a loading indicator to appear, then the outcome.

**Oral check:** `waitForTimeout(2000)` guesses duration; `expect(row).toBeVisible()`
names the condition (“the new row is on screen”) and retries until it is true or
the test times out for a real reason.

---

## Playwright waiting vs RTL `waitFor`

| | **RTL (Phase 1)** | **Playwright (Phase 2)** |
|---|---|---|
| Default | Sync DOM; `findBy*` / `waitFor` when async | Auto-wait on actions + retried `expect` |
| Common wait | `await screen.findByRole(…)` | `await expect(locator).toBeVisible()` |
| Generic | `waitFor(() => { expect(…).toBe(…) })` | Same idea via locator assertions |
| Sleeps | Also discouraged | `waitForTimeout` equally discouraged |

Mental model transfers: wait for **what the user sees**, not for a timer.

---

## Network delays, loading states, race conditions

**Network delay** — create action takes hundreds of ms; list refresh after
`router.refresh()` is not instant.

**Loading state** — UI should show that submit is in progress (disabled button,
“Saving…”, etc.) so users and tests have a signal.

**Race** — asserting the new row *before* navigation finishes, or clicking submit
twice because the button stayed enabled.

Flaky E2E almost always means: the test raced the app instead of waiting on a
stable signal.

---

## Flaky tests

A **flaky** test sometimes passes and sometimes fails with no product change.
Typical E2E causes:

- fixed timeouts
- depending on another test’s data (Item 6)
- asserting too early
- selectors that match multiple nodes

Item 5’s antidote: assert application state (loading → done → outcome).

---

## Loading + error workflows (invoice-shaped)

**Happy path with loading:**

1. User submits a valid invoice
2. UI enters loading (submit unavailable or labeled saving)
3. Request completes
4. User lands on list; invoice appears

Wait on: disabled/loading control → list URL/heading → row visible.  
Do **not** wait on `waitForTimeout`.

**Error path:**

1. Create fails (forced failure — narrow `page.route`; full mock curriculum is Item 7)
2. User sees `role="alert"` (on `CreateInvoiceView`)
3. Form fields still hold what they typed (not silently cleared)

---

## What should replace `waitForTimeout`

| Instead of sleeping for… | Wait for… |
|---|---|
| “form to load” | heading / labeled field visible |
| “save to finish” | button disabled then list URL / row / alert |
| “table to refresh” | row with customer text, or count change |
| “navigation” | `toHaveURL` |

Optional verification: **artificially slow** the create path so loading is
observable — still assert state, do not raise sleep timeouts.

---

## In this project

| Piece | Value |
|---|---|
| Spec | `tests/e2e/create-invoice.spec.ts` |
| Loading UI | `CreateInvoiceForm` — `isPending` while awaiting `onSubmit`; submit label **“Saving…”**; submit + cancel disabled |
| Success asserts | “Saving…” visible + disabled → `/invoices` → row with customer |
| Error asserts | `role="alert"` → still `/invoices/new` → Customer/Amount/Status/Due date keep values |
| Slow create (success) | `page.route("**/invoices/new")` delays POST with `next-action` header (~750ms), then `continue` |
| Force failure (error) | same route pattern **aborts** the server-action POST |
| Why route the page URL? | Create is a Next.js **server action** (browser → Next → Supabase), not a client Supabase fetch |
| No sleeps | Specs never call `waitForTimeout` — delay lives only inside the route handler |
| Jest | `testPathIgnorePatterns` excludes `tests/e2e/` so Playwright files are not loaded by Jest |
| Port override | `PLAYWRIGHT_BASE_URL=http://localhost:3001` when another app owns `:3000` |

### Product change (Item 5 Build)

`CreateInvoiceForm` awaits `onSubmit` and owns pending UI. `CreateInvoiceView`
already returned a Promise from `handleSubmit` (awaits `createInvoiceAction`);
no separate view-level pending flag was required.

### How to run

```bash
# Prefer this app’s port if :3000 is another Next project
PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e
npm run test:e2e -- tests/e2e/create-invoice.spec.ts
npm test
```

---

## Key Insight

Good Playwright tests wait for meaningful conditions.

Time is a poor proxy for “ready.” Application state is the contract.
