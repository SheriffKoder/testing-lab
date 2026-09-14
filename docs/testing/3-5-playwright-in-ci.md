# Playwright in CI

> Phase 3 · Item 5 · Concepts + project wiring.
>
> Builds on [`3-4-github-actions-jobs-and-cache.md`](./3-4-github-actions-jobs-and-cache.md)
> and [`2-8-playwright-debugging-and-strategy.md`](./2-8-playwright-debugging-and-strategy.md).
>
> Next: secrets, env, and environments — Item 6. That item reviews every
> variable. This item only wires the two values the journeys need.

Items 2–4 made lint, types, Jest, and `next build` unavoidable on a clean
runner. Item 5 does the same for **Playwright**. Secrets get a full
review in Item 6; this item only wires the env the journeys actually
need.

The phase goal:

> An E2E suite that only works on your machine is not production-ready.

CI exposes whether the test environment is truly repeatable: browsers,
server start, and a real Supabase — not leftover `next dev` on your
laptop.

---

## Why browser tests need extra CI setup

Jest runs in **jsdom** inside Node. Playwright drives a **real
browser**. The GitHub runner has neither Chromium nor your local
Playwright cache.

`npm ci` installs `@playwright/test`. It does **not** download browser
binaries. Without a browser-install step, the job fails with “executable
doesn’t exist,” not with an assertion.

Jest also does not start Next. Playwright’s `webServer` does. That is
another moving part the runner must perform from empty.

---

## Browser binaries

Playwright ships pinned browser builds (Chromium, Firefox, WebKit).
This lab’s config is **Chromium only**.

```bash
npx playwright install --with-deps chromium
```

`--with-deps` installs OS libraries the headless browser needs on
Linux. Skip it locally if browsers are already in
`~/Library/Caches/ms-playwright/`. Do not skip it on `ubuntu-latest`.

Install **only Chromium** in CI. Extra browsers cost time and do not
match `playwright.config.ts`.

---

## Headless execution

**Headless** means no visible window. GitHub-hosted runners have no
display. Playwright defaults to headless on CI.

`npm run test:e2e:headed` and `test:e2e:ui` are local debug. They need
a screen and do not belong in YAML.

You debug a CI fail from **artifacts** (trace, HTML report,
screenshot), not by watching the runner.

---

## Why Playwright works differently from Jest in CI

| | Jest + RTL | Playwright |
|---|---|---|
| Process | Node + jsdom | Node + real Chromium |
| Extra install | None after `npm ci` | Browser binaries + Linux deps |
| App | Mocked / not started | `webServer` starts Next |
| Data | Mocks | Real Supabase (`tl_invoices`) |
| Failure output | Assertion text | Assertion + trace / screenshot / HTML report |
| Flakes | Rare if isolated | Timing, network, shared DB |

GitHub Actions does not replace Playwright. It **runs** Playwright on a
clean machine so a forgotten `npm run test:e2e` cannot land.

```text
Playwright
→ executes browser tests

GitHub Actions
→ executes Playwright automatically
```

---

## Starting the application

The runner has no `next dev` already up. `playwright.config.ts`
already starts one:

```text
webServer.command = "npm run dev"
webServer.url     = baseURL (localhost:3000)
reuseExistingServer = !process.env.CI
```

On CI, `CI=true` is set automatically. `reuseExistingServer` is
**false**, so the job always starts a fresh server and waits for the
URL. Locally you may reuse a running `next dev`.

Do not point CI at a production or Vercel URL. This lab’s journeys use
`webServer` + Supabase
([`2-8-playwright-debugging-and-strategy.md`](./2-8-playwright-debugging-and-strategy.md)).

---

## CI-specific retries, workers, traces

`playwright.config.ts` already reads `CI`:

| Setting | Local | CI (`CI=true`) |
|---|---|---|
| `retries` | `0` | `2` |
| `forbidOnly` | off | on (`test.only` fails the job) |
| `reuseExistingServer` | yes | no |
| `trace` | `on-first-retry` | same — a zip appears on the first retry |

**Retries are not the first fix.** They absorb leftover racy browsers.
If the same spec flakes every run, fix waiting or isolation (Phase 2),
do not raise `retries` again.

**Workers.** `fullyParallel: true` can run specs together. More workers
on a small runner can *increase* flakes (CPU, shared Supabase). Prefer
the default until a job is slow; drop to one worker only if CI proves
contention. Do not “fix” flakes by adding `waitForTimeout`.

---

## Screenshots, HTML reports, artifacts

On a laptop you open the headed browser. On CI you download files.

| Output | What it is | When you need it |
|---|---|---|
| HTML report (`playwright-report/`) | Index of the run | Always useful after a red e2e job |
| `trace.zip` | Scrubber (`show-trace`) | First CI retry of a failed test |
| Screenshot / video | Still or clip of the page | Headless fail you cannot watch |

These are **artifacts**: output of **this** run, kept so a human (or a
later step) can open them. They are not a cache, and they are not
commits. GitHub stores the zip on the **Actions run**; it is not added
to the git repo. Do not upload `.env` or secrets.

Upload the report (and `test-results/` if present) when the e2e job
fails. Optional: upload on success too. Keep retention short.

---

## Flaky tests and CI race conditions

A **flaky** test fails sometimes with no code change.

CI exposes races that a laptop hides:

- colder machine, more load
- no reused `next dev`
- Linux Chromium instead of macOS Chrome
- two workers hitting the same Supabase table
- leftover rows if isolation is weak (`uniqueTlCustomer` exists for
  this reason)

**Do not raise timeouts first.** A longer timeout waits longer for the
same bug. Fix the locator, the wait, or the data setup
([`2-5-playwright-waiting.md`](./2-5-playwright-waiting.md)).

---

## The E2E pipeline

```text
Install dependencies          npm ci
        ↓
Install Playwright browsers   chromium + Linux deps
        ↓
Start the application         webServer → npm run dev
        ↓
Run browser tests             npm run test:e2e
        ↓
Preserve debugging artifacts  report / trace on failure
```

That extra browser step is why e2e is its **own job**. `quality` and
`tests` should not pay for Chromium.

---

## Environment (this item vs Item 6)

Journeys insert real rows. Next needs
`NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Those are **public** client
values, but they are still **project-specific**. Do not paste them into
YAML.

This item: pass them into the **e2e** job from GitHub Actions
secrets or variables (`env:`). Item 6 reviews every variable, updates
`.env.example`, and documents Local / CI / Production.

No privileged service-role key. No secrets in the workflow file.

---

## What this item does **not** do

- Full secrets / environments write-up (Item 6)
- Required checks / Husky (Item 7)
- Deploy on green (Item 8)
- Firefox / WebKit
- `test:e2e:headed` / `test:e2e:ui` in YAML
- Pointing Playwright at a deployed URL
- Running `npm run verify` **inside** the workflow (the job still
  calls `npm run test:e2e`)

`npm run verify` **is** in `package.json`: the PR sequence is complete
(lint, types, Jest, e2e, build). It stays a **local** convenience. Do
not hook it to YAML or pre-commit.

---

## In this project

| Piece | Value |
|---|---|
| Workflow | `.github/workflows/ci.yml` |
| Job | **`e2e`** — own runner, no `needs` |
| Node | `24.12.0` (`.nvmrc` + `setup-node`) |
| Cache | `cache: npm` (lockfile key; does not install browsers) |
| Browsers | `npx playwright install --with-deps chromium` |
| Command | `npm run test:e2e` (`playwright test`) |
| Config | `playwright.config.ts` — `retries: 2`, `forbidOnly`, no server reuse, `trace: on-first-retry` when `CI=true` |
| Artifact | `playwright-report/` + `test-results/` on **failure**; `actions/upload-artifact@v7`; 7 days |
| Env | `NEXT_PUBLIC_SUPABASE_URL` from `vars`; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `secrets` — not `.env` on the runner |
| Local replica | `npm run ci` → lint + typecheck + test + test:e2e + build (serial) |
| Local full sequence | `npm run verify` — same command list; **not** a workflow command |
| Not in YAML | `npm run verify`, `test:e2e:headed`, `test:e2e:ui` |

```text
CI
├── quality   checkout → Node → npm ci → lint → typecheck
├── tests     checkout → Node → npm ci → test
├── build     checkout → Node → npm ci → build
└── e2e       checkout → Node → npm ci → playwright install chromium --with-deps
              → test:e2e  (upload report on failure)
```

No `needs`. A red `quality` does not hide an e2e fail. E2E starts
`next dev` via `webServer`; it does not consume the `build` job’s
`.next`.

`CI=true` is already set by GitHub Actions. The job does not set it by
hand.

The artifact is stored on **that Actions run**. It is not a git commit.
`playwright-report/` and `test-results/` stay gitignored.

`npm run ci` and `npm run verify` are the same five commands on your
machine. YAML still calls the individual commands (`npm run test:e2e`
on the e2e job). Neither script is the workflow command.

### How to read a run

On GitHub: **Actions** tab, or the PR checks list → `CI`.

| Red job | Layer |
|---|---|
| `quality` | ESLint or `tsc --noEmit` |
| `tests` | Jest + RTL |
| `build` | `next build` |
| `e2e` | Playwright (Chromium + `webServer`) |

On a red `e2e` job: open the job log, then download the
`playwright-report` artifact. Unzip it, open `index.html`, or run
`npx playwright show-trace` on a `trace.zip` under `test-results/`.

### How to run locally

```bash
CI=true npm run test:e2e
npm run ci
npm run verify
```

`CI=true` exercises retries / `forbidOnly` / a fresh `next dev`. `npm
run ci` and `npm run verify` are the full serial sequence. CI still
installs Chromium on a clean Ubuntu runner.

---

## Self-check

**Does GitHub Actions replace Playwright?**  
No. Playwright executes the browser tests. Actions executes Playwright.

**Why a fourth job instead of hanging e2e off `tests`?**  
Browsers are extra install cost. `quality` and Jest should not pay for
Chromium. A red **job** name is the layer.

**Why upload the report only on failure?**  
The artifact is debugging evidence for **this** run, not a cache and
not a git file. Keep retention short. Values never appear in YAML.

---

## Key insight

An E2E suite that only works on your machine is not production-ready.

CI exposes whether your test environment is truly repeatable.
