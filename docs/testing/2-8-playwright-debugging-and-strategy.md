# Playwright Debugging, Test Strategy, and Cypress Awareness

> Phase 2 · Item 8 · Concepts + project wiring + the combined invoice map.
>
> Builds on [`2-7-playwright-network-testing.md`](./2-7-playwright-network-testing.md).
>
> Unit “what is worth testing?”:
> [`1-8-testing-strategy.md`](./1-8-testing-strategy.md) and
> [`1-8-testing-inventory.md`](./1-8-testing-inventory.md).
>
> Layer buckets (Jest+RTL / Playwright / Both / Not worth):
> [`2-1-invoice-test-boundaries.md`](./2-1-invoice-test-boundaries.md).
>
> When those layers run (local / PR / main / deploy):
> [`3-1-ci-cd-mental-model.md`](./3-1-ci-cd-mental-model.md) and
> [`3-1-ci-checks-map.md`](./3-1-ci-checks-map.md).
>
> Next: Phase 3 Item 2 — GitHub Actions fundamentals
> ([`3-2-github-actions-basics.md`](./3-2-github-actions-basics.md)).
> New features still reuse the layer decision rule below — do not start a
> third inventory.

Items 2–7 made Playwright runnable and useful. Item 8 is how you **debug** a
red E2E, how you **choose a layer** for the next feature, and how Cypress
**reads** if you join a repo that still uses it.

The phase goal:

> What can break here, how important is it, and what is the cheapest reliable
> layer that can protect it?

---

## Debugging

A failing Playwright test is a **signal**, not a reason to add
`waitForTimeout`. Find why the UI did not reach the state you asserted.

### Playwright UI mode

```bash
npm run test:e2e:ui
```

Live test explorer: pick a spec, run it, then **scrub** the timeline. Best for
“what did the test actually click, and what did the page look like then?”

A red X on a step is a **real fail of that run** (the action or the expect
after it) — not a separate “error reproduction” mode.

### Trace Viewer

Same scrubber as UI mode, from a **saved** `trace.zip`. You do not load the
zip into the explorer; `show-trace` *is* the recorded-run UI.

```bash
npx playwright test tests/e2e/create-invoice.spec.ts --trace on
npx playwright show-trace test-results/.../trace.zip
```

This repo’s default is `trace: "on-first-retry"`. A zip appears when a test
**fails and then retries**. Locally `retries: 0`, so a fail does **not** write
a zip unless you pass `--trace on` (then you get a zip for pass **or** fail).

On CI, `CI=true` sets `retries: 2`. The first retry writes
`test-results/.../trace.zip` on the runner. The **e2e** job uploads
`playwright-report/` and `test-results/` when that job **fails** —
download the artifact from the Actions run, then open
`playwright-report/index.html` (suite report) or
`npx playwright show-trace` on a `trace.zip`. See
[`3-5-playwright-in-ci.md`](./3-5-playwright-in-ci.md).

`test-results/` is gitignored. Locally each run is
`test-results/<timestamp>/` so history is kept. On CI the folder is
flat (the Actions run is the version). Delete old stamps when you no
longer need them.

### Screenshots and videos

Config (`screenshot`, `video`) or failure artifacts under `test-results/`.
Useful on headless CI when you cannot watch the browser.

### Headed mode

```bash
npm run test:e2e:headed -- tests/e2e/create-invoice.spec.ts
```

Watch Chromium live. You cannot rewind. Slow; use for one spec.

### `--debug` and Inspector

```bash
npx playwright test tests/e2e/create-invoice.spec.ts --debug
```

Pauses on each Playwright action. Step one click at a time. `page.pause()`
opens the inspector mid-test.

### Which command for which question

| Question | Command |
|---|---|
| Watch it once | headed |
| Scrub “which click / which page state” | UI mode |
| Step line by line | `--debug` |
| Save a recording to open later | `--trace on` + `show-trace` |

### Reading failure logs

Typical shape:

- locator resolved to 0 or 2+ elements
- timeout waiting for `toBeVisible` / `toHaveURL`
- webServer never reached `baseURL` (wrong port — `PLAYWRIGHT_BASE_URL`)
- browser binary missing (`PLAYWRIGHT_BROWSERS_PATH`)

The error names the **assertion**, not always the **cause**. Trace + headed
show whether you are still on `/invoices/new`, still “Saving…”, or looking at
the wrong row.

### Retrying locally vs hiding flakes

CI `retries: 2` is a safety net. **Do not** “fix” a flake by raising retries
or sleeping. Isolation (Item 6), waiting on state (Item 5), and unique data
are the real fixes. Reproduce locally **without** retries (`retries: 0` is
already the local default).

---

## Test strategy — decision rule

```text
Pure business logic?
→ Jest

Component behavior?
→ RTL

Multiple parts of the application working together?
→ Playwright

Critical user journey?
→ Usually Playwright

Complex business logic inside that journey?
→ Jest/RTL + Playwright
```

Duplicating every assertion across layers is wasteful. RTL already owns
validation strings and formatters. Playwright owns “user created an invoice
and sees it.” Jest owns `formatCurrency` / `toInvoice` — do not re-assert
those in the browser.

Phase 1 Item 8 asked “what is worth a **unit** test?”
Phase 2 Item 8 asks “which **layer** for this behavior?”

---

## Application testing map

Current invoice app only. Do not invent edit/delete. Do not add tests to fill
empty cells.

| Behavior | Jest | RTL | Playwright | Reason |
|---|---|---|---|---|
| Currency / status formatting | Yes | No | No | Pure helpers — cheapest in Jest; do not re-assert in the browser |
| Invoice form validation / keyboard | No | Yes | No | Component contract (`CreateInvoiceForm`); Playwright must not copy every message |
| Table headers / rows / empty | No | Yes | Smoke only | RTL owns the UI states; smoke accepts a real table **or** empty (SSR list) |
| List page loads | No | No | Yes | Next route over HTTP — Jest never opens `/invoices` |
| List fetch fail + retry | Yes | Yes (`error.tsx`) | No | `listInvoices` is RSC — not a browser `fetch` (Item 7) |
| Create persist journey | Yes (mocked mutation) | Yes (mocked action + router) | **Yes (real)** | Unit/wiring prove the cut; only E2E proves insert → refreshed row |
| Create loading + persist fail | No | Partial (pending + alert) | Yes | Hard/noisy to produce in Supabase; delay + `abort` own the UI story |
| Delete / edit invoice | — | — | When built | Not invented for demos |

### Current files (who owns what)

| Area | Jest | RTL | Playwright |
|---|---|---|---|
| Formatters / status | `format-currency`, `format-invoice-status` | — | — |
| Table render / empty | — | `invoices-table` | Smoke: heading + table **or** empty (`invoices.spec.ts`) |
| Form validation / keyboard | — | `create-invoice-form` | — |
| List async / `error.tsx` | mocked `InvoicesSection` + `error.test.tsx` | — | Not interceptable (RSC) |
| Create persist | `create-invoice` mutation (mocked Supabase) | `create-invoice-view` (mocked action) | **Real** persist journey |
| Create loading / action fail | — | form pending + view alert | delay + `abort` |

---

## Cypress awareness

Many codebases still use Cypress. **Do not install Cypress. Do not rewrite
this suite.** Learn the translation.

| Concern | Playwright | Cypress |
|---|---|---|
| Test fn | `test("…", async ({ page }) => {})` | `it("…", () => {})` |
| Navigate | `await page.goto("/invoices")` | `cy.visit("/invoices")` |
| Find | `page.getByRole("button", { name: "Create invoice" })` | `cy.contains("button", "Create invoice")` |
| Click | `await button.click()` | `cy.contains("Create invoice").click()` |
| Assert | `await expect(locator).toBeVisible()` | `cy.contains("…").should("be.visible")` |
| Network | `await page.route(...)` | `cy.intercept(...)` |

### What Cypress is

A browser E2E runner with a time-travel UI, built-in retry-ability, and a
command queue (`cy.*`) instead of Playwright’s async/await API.

### Why companies still use it

It was the default frontend E2E tool for years. Large suites, plugins, and
team muscle memory remain. Cypress Cloud / Dashboard is familiar in many orgs.

### Why Playwright for this lab

- First-class `async`/`await` (closer to app code)
- Multi-browser (Chromium / Firefox / WebKit) without a separate paid story
- Chosen once for the curriculum — one runner, not two

### What transfers

Journeys, semantic locators, auto-waiting, isolation, real vs intercepted
network, “don’t test every button in E2E.” The **ideas** are the same; the
**API** is a dictionary lookup.

### High-level architecture differences

- Cypress: commands enqueue; the test function returns before they finish.
  You do not `await cy.visit`.
- Playwright: you `await` every action; fixtures inject `page`.
- Cypress historically runs in the browser; Playwright drives the browser
  from Node (easier to mix file/DB helpers — still used carefully).

Learning both APIs in depth **now** has diminishing returns. Read Cypress;
write Playwright here.

---

## In this project

| Piece | Value |
|---|---|
| Scripts | `test:e2e`, `test:e2e:headed`, `test:e2e:ui` |
| Local retries | `0` — fail once, read the log |
| CI retries | `2` when `CI=true` (GitHub Actions sets this on the runner) |
| Trace default | `on-first-retry` — zip on the first **retry**, not every fail |
| CI artifact | `e2e` job uploads `playwright-report/index.html` + `test-results/` on failure (7 days; not a git commit) |
| HTML report | `reporter: [["list"], ["html"]]` — local: `playwright-report/<timestamp>/`; CI: `playwright-report/`. `npx playwright show-report <folder>` |
| Local zip | Pass `--trace on`; file lands in `test-results/<timestamp>/` (gitignored; same stamp as the HTML report) |
| Port | `PLAYWRIGHT_BASE_URL=http://localhost:3001` when `:3000` is another app |
| Browsers | `PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright` if headed cannot find Chromium |
| Cypress | **Not** installed |
| Debug practice | Item 8 step 1 — break locally, use UI / headed / `--debug` / `--trace on`, restore. No committed red test |
| Verify finding | `getByRole("alert")` hit **2** nodes — form `<p>` + Next `#__next-route-announcer__`. Filter `{ hasText: /failed/i }` |

### How to run

```bash
npm test
npm run test:e2e
npm run test:e2e:ui
npx playwright test tests/e2e/create-invoice.spec.ts --trace on
npx playwright show-trace test-results/.../trace.zip
```

Oral checks:

> What can break here, and what is the cheapest layer?

> If I joined a Cypress repo tomorrow, which ideas would already feel familiar?

---

## Key Insight

Testing maturity is not knowing many testing APIs.

It is knowing which layer is the cheapest reliable protection for the behavior
that can actually break.
