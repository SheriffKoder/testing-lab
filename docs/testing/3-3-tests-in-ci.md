# Tests in CI

> Phase 3 · Item 3 · Concepts + project wiring.
>
> Builds on [`3-2-github-actions-basics.md`](./3-2-github-actions-basics.md)
> and [`3-1-ci-checks-map.md`](./3-1-ci-checks-map.md).
>
> Next: jobs, cache, and `npm run build` — Item 4
> ([`3-4-github-actions-jobs-and-cache.md`](./3-4-github-actions-jobs-and-cache.md)).

Item 2 made lint and types unavoidable. Item 3 does the same for **Jest +
RTL** (unit and mocked-wiring tests). Playwright stays **out** (Item 5).
Job splits and `npm run build` stay **out** (Item 4).

> Tests only become team safeguards when they run automatically.

GitHub Actions does not replace Jest. It **runs** Jest on a clean machine
so a forgotten `npm test` cannot land.

```text
Jest
→ executes tests

GitHub Actions
→ executes Jest automatically
```

---

## Why tests should run in CI

Local `npm test` is optional. A developer can skip it, run a subset, or
have a dirty `node_modules`. CI runs the **same command** after `npm ci`
on an empty runner. That is the Item 1 argument applied to Jest.

If the repository says “the invoice form mapping must stay correct,” the
workflow should prove it on every PR — not only when someone remembers.

---

## Exit codes

Jest (and every gate) talks to CI through the **process exit code**.

| Exit | Meaning | Workflow |
|---|---|---|
| `0` | All tests passed | Step succeeds; next step runs |
| Non-zero | A test failed, or Jest crashed | Step fails; the job goes red |

CI does not read the HTML report to decide. It reads the exit code. That
is why a “failed” test that is accidentally treated as skipped, or a
script that always exits `0`, is invisible to the gate.

**CI must fail when tests fail.** A green check with red assertions is
worse than no CI.

---

## Watch mode is not CI

`npm run test:watch` (`jest --watch`) is interactive. It waits for file
changes and **does not exit**. A workflow step that never exits hangs the
job until timeout.

This repo’s `npm test` is already `jest` — one run, then exit. That is
the CI command. Do not call `test:watch` in YAML.

Jest also has `--ci` (CI-friendly reporter, no watch). This lab did not
add a `test:ci` script. `npm test` already exits cleanly.

---

## Deterministic tests

A **deterministic** test gives the same result on the same commit, every
machine. CI exists to prove that.

Dangerous in CI (and locally):

- depending on files only on your laptop
- wall-clock dates without control
- network calls to a live API from a “unit” test
- order-dependent tests that share mutable global state
- `test.only` left in the file

If it only passes on your machine, it is not a team safeguard.

---

## Test environment vs developer machine

Jest here uses **jsdom** — a fake DOM, not Chrome. `tests/setupTests.ts`
loads jest-dom matchers. That environment is created from the repo
(`jest.config.ts`).

Still not identical to a laptop:

- OS is Linux on `ubuntu-latest`
- no leftover `node_modules`
- env files: next/jest loads `.env*` from the repo; **secrets** are
  Item 6
- `jest.config.ts` maps `@/` so `jest.mock("@/...")` resolves

If a test needs a privileged key or a running Next server, it does not
belong in this job. That is Playwright or Item 6.

---

## Environment variables

`process.env` in CI is **empty** unless the workflow or the host sets
it. Locally you may have `.env.local` that is git-ignored.

Jest + RTL in this lab must keep working with **repo defaults and
mocks**. Do not wire Supabase secrets so unit tests can hit a real
project.

`CI=true` is set automatically by GitHub Actions. Jest’s `npm test`
does not require you to set it by hand.

---

## Coverage in CI

`npm run test:coverage` (`jest --coverage`) is a **spotlight**, not a
score ([`1-8-testing-strategy.md`](./1-8-testing-strategy.md)).

| Do | Do not |
|---|---|
| Generate a report locally when you want one | Fail the job because % dropped 0.4 |
| Keep `collectCoverageFrom` scoped to FSD layers | Invent a threshold “to have a number” |

This item does **not** add `coverageThreshold` and does **not** upload
coverage as an artifact (Item 4 language).

---

## Flaky tests and retries

A **flaky** test fails sometimes and passes on rerun with no code
change.

**Retries are not the first fix.** Playwright uses limited CI retries
because browsers are racy. Jest + jsdom should almost never need
`--retries`. Fix the test or the isolation.

---

## In this project

| Piece | Value |
|---|---|
| Workflow | `.github/workflows/ci.yml` — Jest lives in the `tests` job (Item 4 split) |
| Node | `24.12.0` (`.nvmrc` + `setup-node`) |
| Test command | `npm test` (`jest`, non-watch) |
| Local replica | `npm run ci` → lint + typecheck + test + build |
| Jest config | `jest.config.ts` ignores `tests/e2e/` |
| Coverage % gate | **None** |
| Not in YAML | `test:watch`, Playwright, `npm run verify` |

Item 3 added the Test step on a single `verify` job. Item 4 moved Jest
into its own `tests` job (see
[`3-4-github-actions-jobs-and-cache.md`](./3-4-github-actions-jobs-and-cache.md)):

```text
tests: checkout → setup-node → npm ci → test
```

`npm run ci` matches today’s command list on your machine (including
build). It is **not** `npm ci` (the lockfile install).

`npm run verify` (full PR sequence: also e2e) is still **not**
in `package.json` and must **not** be the workflow command.

### How to read a run

On GitHub: **Actions** tab, or the PR checks list → `CI` → `tests`.

| Red job / step | Layer |
|---|---|
| `quality` / Lint | ESLint |
| `quality` / Typecheck | `tsc --noEmit` |
| `tests` / Test | Jest + RTL |
| `build` / Build | `next build` |

A Test failure is Jest output (suite name, assertion), not an ESLint
filename list.

### How to run locally

```bash
npm run ci
```

Same four commands as today’s YAML, serial on your machine. CI still
starts each job from `npm ci` on a clean runner.

---

## Self-check

**Does GitHub Actions replace Jest?**  
No. Jest executes the tests. Actions executes Jest.

**Why not `test:watch` in the workflow?**  
It never exits. The job would hang until timeout.

---

## Key insight

Tests only become team safeguards when they run automatically.

Tests that developers can simply forget to run provide much weaker
protection.
