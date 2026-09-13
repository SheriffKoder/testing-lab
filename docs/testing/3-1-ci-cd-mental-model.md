# CI/CD Mental Model

> Phase 3 · Item 1 · Concepts / explanation.
>
> Companion command map: [`3-1-ci-checks-map.md`](./3-1-ci-checks-map.md).
>
> Builds on [`1-8-testing-strategy.md`](./1-8-testing-strategy.md) and
> [`2-8-playwright-debugging-and-strategy.md`](./2-8-playwright-debugging-and-strategy.md).
>
> Next: GitHub Actions fundamentals — Item 2
> ([`3-2-github-actions-basics.md`](./3-2-github-actions-basics.md)).

Phases 1 and 2 asked: *Does this code behave correctly?*

Phase 3 asks:

> How do we guarantee that every change is verified before it reaches production?

This item does **not** create GitHub Actions. It locks the mental model so later
items do not dump every command into every pipeline stage.

---

## Continuous Integration (CI)

**CI** is the practice of merging small changes often, and automatically
**verifying** each change on a clean machine that is not the author’s laptop.

In this lab that means: push or open a PR → GitHub Actions runs lint, types,
Jest, Playwright, and build (those jobs land in later items).

CI answers: *Would this change still pass the team’s checks if I had never run
them locally?*

---

## Continuous Delivery vs Continuous Deployment

Both are **CD**. They are not the same.

| | **Continuous Delivery** | **Continuous Deployment** |
|---|---|---|
| After CI passes | The app is **always ready** to ship | The app **is shipped** automatically |
| Production release | A human still clicks “deploy” (or promotes a build) | Merge to `main` deploys — no extra click |
| Typical gate | Review + required checks + optional approval | Same checks; deploy is the merge |

**CI** = verify every change.  
**CD** = get verified code toward (or onto) production.

This lab can stop at **delivery** (Vercel or similar deploys `main` after
checks). Automatic production deploys without a human is a product choice, not
a YAML requirement.

---

## Why CI exists

Developers forget. Laptops differ. “I ran `npm test`” is not the same as
“the repository proved it.”

CI exists so engineering standards are:

- **Repeatable** — same commands, same Node, same lockfile
- **Enforceable** — a red check can block merge (Item 7: branch protection)
- **Shared** — every PR gets the same gates, not just careful people

CI is **not** another test runner. Jest and Playwright still run the tests.
CI is the system that **runs them for everyone, every time**.

---

## What CI should verify

Typical gates (this repo already has most of the commands):

```text
Lint
Type Check
Unit / component tests (Jest + RTL)
E2E tests (Playwright)
Build (`next build`)
```

CI should verify things that:

- can break for other people (types, lint, tests)
- depend on a clean install (`npm ci`, not leftover `node_modules`)
- must stay true before merge (not optional style nits that nobody agreed on)

---

## What CD does

After verification, CD **moves** the verified artifact:

```text
Verified commit on main
        ↓
Build / host-specific compile
        ↓
Preview (often per PR) or Production (often main)
```

Hosting (Vercel, etc.) often owns “deploy on push.” GitHub Actions owns
“prove it first.” Item 8 wires that relationship; this item only names it.

---

## Local validation vs centralized validation

| | **Local** | **CI (centralized)** |
|---|---|---|
| Who runs it | The developer, if they remember | The repository, on every PR / push |
| Environment | Your Node, your `.env`, your leftover cache | A clean runner + lockfile |
| Purpose | Fast feedback while coding | Team-wide proof |
| Can be skipped | Yes (`--no-verify`, forgot, different OS) | Only if you disable the workflow |

Local checks are **convenience**. CI is **enforcement** (once branch protection
exists). Husky (Item 7) sits in between: fast local reminder, still bypassable.

---

## Why “works on my machine” is insufficient

Your machine can have:

- a global package the lockfile does not list
- a filled `.env` that CI does not have
- Playwright browsers already cached
- a dirty `node_modules` that hides a missing dependency
- a different Node version than production

A green local `npm test` does not prove a **clean clone** would build.

---

## Why CI should run from a clean environment

Every GitHub-hosted runner starts empty: no repo, no `node_modules`, no your
`~/.zshrc`.

That is the point. `npm ci` installs **exactly** what `package-lock.json`
says. If the lockfile is wrong, CI fails **before** users do.

A pipeline that reuses a developer’s laptop state is not CI.

---

## What should block a pull request

Things that mean “this change is unsafe or unmergeable”:

- Lint errors the team agreed to enforce
- Type errors
- Failed Jest / RTL tests
- Failed Playwright journeys that this repo treats as required
- Failed `next build`

These are **merge gates** once Item 7 protects `main`.

---

## What should not necessarily block a pull request

Not every useful signal is a hard gate:

- Coverage **percentage** ([`1-8-testing-strategy.md`](./1-8-testing-strategy.md):
  coverage is a spotlight, not a score)
- Optional format-only diffs nobody standardized
- Slow exploratory Playwright headed / UI runs
- Preview deploy “looks ugly” without an agreed visual test
- Nice-to-have docs typos (unless you choose to lint them)

If everything blocks merge, people disable CI. Prefer a **small** set of
required checks.

---

## The progression

```text
Developer writes code
        ↓
Local checks          ← fast; optional; your machine
        ↓
Push / Pull Request
        ↓
CI pipeline           ← clean runner; required later
        ↓
Automated verification
        ↓
Merge
        ↓
Deployment            ← host or Actions; only after relevant checks
```

---

## Typical CI gates

```text
Lint
Type Check
Unit Tests
Integration Tests     ← this lab: Jest wiring / mocked section (not a 2nd runner)
E2E Tests
Build
```

This repo’s “integration” layer is already inside `npm test` (Jest) plus one
real Playwright persist journey. Do **not** invent a second test runner for
the map.

---

## Why not every check at every moment

Cost and speed differ:

```text
Pre-commit
→ very fast checks     (lint staged files — Item 7)

Local `npm run verify` (optional, before push)
→ same sequence as the pull-request gate

Pull Request
→ full validation      (lint, types, Jest, Playwright, build)

Main branch
→ full validation + deployment
```

`npm run verify` is a **local convenience** (Item 2). It does not replace
GitHub Actions. Do not hook it to pre-commit.

Running Playwright on every keystroke is waste. Skipping Playwright on the
PR that changes the create journey is also waste. Match **when** to **risk**.

---

## In this project (review)

Commands that already exist:

| Command | What it proves |
|---|---|
| `npm run lint` | ESLint (`eslint.config.mjs` — Next core-web-vitals + TypeScript) |
| `npm test` | Jest + RTL under `tests/unit/` (ignores `tests/e2e/`) |
| `npm run test:coverage` | Same tests + coverage report — not a merge threshold |
| `npm run test:e2e` | Playwright Chromium; `CI=true` already sets retries / no server reuse |
| `npm run build` | Next.js production compile |

**Added in Item 2:** `npm run typecheck` (`tsc --noEmit`) and
`.github/workflows/ci.yml` (job `verify`: `npm ci` → lint → typecheck).
See [`3-2-github-actions-basics.md`](./3-2-github-actions-basics.md).

**Still missing:** `npm run verify` (full local PR sequence). Do not call it
from the first workflow — that would pull Jest, Playwright, and build in
too early.

**Not a CI gate:** `npm run dev`, `npm start`, `test:watch`,
`test:e2e:headed`, `test:e2e:ui`.

**Later:** Husky (Item 7). `.env.example` already exists — Item 6 reviews
secrets; do not expand it here.

Layer choice still lives in
[`2-8-playwright-debugging-and-strategy.md`](./2-8-playwright-debugging-and-strategy.md).
CI **runs** those layers; it does not replace them.

---

## Self-check

**What problem does CI solve that `npm test` on my laptop does not?**  
It proves the same checks on a **clean** machine with the **lockfile** install,
for **every** push/PR — not only when someone remembers to run them locally.

**What is the difference between continuous delivery and continuous deployment?**  
Delivery means verified code is **always ready** to ship (a human may still
promote it). Deployment means a green merge **is** the production release.

---

## Key insight

CI is not another testing tool.

CI is the system that makes engineering standards repeatable and enforceable
for everyone.
