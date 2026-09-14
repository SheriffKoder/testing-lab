# Playwright Setup

> Phase 2 · Item 2 · Concepts + project wiring.
>
> Builds on [`2-1-e2e-mental-model.md`](./2-1-e2e-mental-model.md) and
> [`2-1-invoice-test-boundaries.md`](./2-1-invoice-test-boundaries.md)
> (smoke = “`/invoices` route actually loads”).

Item 1 decided **when** to use Playwright. Item 2 makes Playwright **runnable**:
install the runner, configure it for this Next.js app, and prove the invoices
page loads with one smoke test.

> A healthy Playwright setup should make running browser tests boring and
> predictable.

---

## `@playwright/test`

`@playwright/test` is the official Playwright test runner and assertion library.

It provides:

- `test` / `expect` (similar role to Jest’s API, but Playwright’s own)
- Browser automation (`page`, `browser`, `context`)
- Built-in waiting and locators
- Config via `playwright.config.ts`
- Reporters, traces, screenshots on failure (used more in later items)

It is **separate** from Jest. Phase 1 stays on `npm test` (Jest). Phase 2 uses
dedicated scripts such as `npm run test:e2e`.

---

## Browser binaries

Playwright does not only install an npm package. It also downloads **browser
binaries** (Chromium, Firefox, WebKit builds) that the tests drive.

Typical first-time flow:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Without binaries, tests fail with “browser not found” even if the npm package
is present. CI must install browsers too (often `npx playwright install --with-deps`).

### Note: install location (Cursor agents vs your terminal)

Playwright looks for browsers under the default user cache, e.g. on macOS:

```text
~/Library/Caches/ms-playwright/
```

If an agent runs `npx playwright install` inside Cursor’s sandbox, binaries may
land in a **sandbox cache** instead. Your own terminal then fails with:

```text
browserType.launch: Executable doesn't exist at
.../Library/Caches/ms-playwright/chromium-.../Google Chrome for Testing
```

even though `@playwright/test` is installed.

**Fix:** install into the real user cache (from your terminal, or force the path):

```bash
npx playwright install chromium

# if an agent install still goes to a sandbox cache:
PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
  npx playwright install chromium
```

After upgrading `@playwright/test`, re-run the install so the binary version
matches the package.

---

## `playwright.config.ts`

The config file is **application infrastructure** — inspect it before reading
individual specs when joining a project.

Common fields for this lab:

| Option | Role |
|---|---|
| `testDir` | Where specs live |
| `fullyParallel` / `workers` | Parallelism (keep simple at first) |
| `retries` | Often `0` locally; maybe `>0` on CI later |
| `use.baseURL` | Root URL for `page.goto('/invoices')` |
| `webServer` | How Playwright starts the app before tests |
| `projects` | Which browsers to run |

Do not add unnecessary configuration on day one.

---

## `testDir`

`testDir` tells Playwright which folder contains `*.spec.ts` / `*.test.ts` files.

In this repo, FSD already reserved:

```text
tests/e2e/
```

Prefer **`tests/e2e`** over a second root-level `e2e/` folder so all automated
tests stay under the FSD `tests/` unit (`unit/`, `integration/`, `e2e/`).

Smoke test path:

```text
tests/e2e/invoices.spec.ts
```

---

## `baseURL`

```ts
use: {
  baseURL: "http://localhost:3000",
}
```

Purpose:

- Let tests write `page.goto("/invoices")` instead of full URLs
- Keep environment differences (port, host) in one place
- Match the Next.js default dev server URL unless configured otherwise

`baseURL` does **not** start the server by itself — that is `webServer` (or you
start `npm run dev` manually).

---

## `webServer`

```ts
webServer: {
  command: "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
}
```

Purpose:

- Playwright runs `command` before the suite
- Waits until `url` responds
- Avoids “forgot to start the app” failures
- `reuseExistingServer` lets local runs attach to an already-running `next dev`

On CI, usually force a fresh server (`reuseExistingServer: false` when `CI` is set).

---

## Headless vs headed mode

| Mode | Meaning | Typical use |
|---|---|---|
| **Headless** | Browser runs without a visible window | CI, default `playwright test` |
| **Headed** | You see the browser UI | Local debugging (`--headed`) |

Why CI usually runs **headless**: no display, faster, same automation API.

Why local debugging may use **headed**: watch clicks, see navigation, catch
selector mistakes visually. Later items add UI mode / traces; Item 2 only needs
headed vs headless observation.

---

## Browser projects

A **project** in Playwright config is a named run target — often one browser
engine (and optionally device / viewport settings).

Common engines:

- **Chromium** — Chrome / Edge family (usually first)
- **Firefox**
- **WebKit** — Safari family

Item 2 default: **Chromium only** for the smoke test. Multi-browser matrix is
optional later; three browsers triple CI time for little early learning value.

---

## Smoke test intent (this item)

One file: `tests/e2e/invoices.spec.ts`

Assert only:

1. Navigate to `/invoices`
2. Page loads
3. Invoice heading is visible
4. List chrome is visible — `<table>` when rows exist, or “No invoices yet”
   empty state when the list is empty (empty branch has no `table` role)

Prefer semantic locators (`getByRole`) if the UI already exposes them — deep
locator doctrine is Item 3. Avoid inventing `data-testid`s unless needed.

Do **not** create an invoice in Item 2. That is a later journey item (and needs
a data strategy).

---

## npm scripts

```json
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:e2e:ui": "playwright test --ui"
```

Keep Jest scripts untouched (`test`, `test:watch`, `test:coverage`).

---

## Key insight

E2E tooling is application infrastructure.

When joining another project, inspect `playwright.config.*` before reading
individual tests.

A healthy setup makes `npm run test:e2e` boring: server starts, browser runs,
smoke passes.

---

## In this project

Exact wiring for this lab (Item 2):

| Piece | Value |
|---|---|
| Install | `npm install -D @playwright/test` then `npx playwright install chromium` (user cache: `~/Library/Caches/ms-playwright`) |
| Runner version | `@playwright/test` 1.63.x |
| Config | `playwright.config.ts` (repo root) — `list` + `html` reporters (`playwright-report/<timestamp>/` locally, gitignored) |
| `testDir` | `./tests/e2e` (FSD; not overview’s root `e2e/`) |
| `baseURL` | `http://localhost:3000` |
| `webServer` | `npm run dev`, reuse local server when not `CI` |
| Project | Chromium only (`Desktop Chrome`) |
| Smoke spec | `tests/e2e/invoices.spec.ts` |
| Artifacts ignored | `test-results/` (local: `<timestamp>/` subfolders), `playwright-report/`, `blob-report/`, `playwright/.cache/` |

If `test:e2e` / `test:e2e:headed` fails with `Executable doesn't exist`, the npm
package is present but Chromium is missing from the user cache — see **Browser
binaries → Note: install location** above.

### How to run

```bash
npm run test:e2e          # headless (default / CI-shaped)
npm run test:e2e:headed   # visible browser
npm run test:e2e:ui       # Playwright UI mode (optional debug)
```

Jest remains on `npm test`. Do not mix runners.
