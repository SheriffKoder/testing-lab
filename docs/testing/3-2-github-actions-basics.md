# GitHub Actions Fundamentals

> Phase 3 · Item 2 · Concepts + project wiring.
>
> Builds on [`3-1-ci-cd-mental-model.md`](./3-1-ci-cd-mental-model.md) and
> [`3-1-ci-checks-map.md`](./3-1-ci-checks-map.md).
>
> Next: Jest in CI — Item 3
> ([`3-3-tests-in-ci.md`](./3-3-tests-in-ci.md)). Jobs, cache, and
> `npm run build` — Item 4
> ([`3-4-github-actions-jobs-and-cache.md`](./3-4-github-actions-jobs-and-cache.md)).

Item 1 decided **what** CI is and **when** each command should run. Item 2
makes a **tiny** workflow real: checkout, Node, `npm ci`, lint, typecheck.

> A CI workflow is executable repository policy.

If the repository says type errors are not allowed, the workflow should prove
that automatically. Jest, Playwright, and deploy stay **out** of this item.

---

## Workflow

A **workflow** is a YAML file under `.github/workflows/` that GitHub runs
when configured events happen.

This item’s file:

```text
.github/workflows/ci.yml
```

One workflow can contain many jobs. Item 2 has **one** job: `verify`.

---

## Event (`on`)

An **event** is what starts the workflow.

| Event | Meaning |
|---|---|
| `pull_request` | Someone opened / updated a PR |
| `push` to `main` | Something landed on the default branch |

**Manual run** (`workflow_dispatch`) is useful later for debugging. Not used
in this workflow yet.

---

## Job

A **job** is a named block that runs on a **runner**. Jobs in the same
workflow can run in parallel unless `needs` ties them (Item 4).

Item 2: one job `verify` — keep isolation simple until there is a reason to
split.

---

## Step

A **step** is one action or one shell command **inside** a job. Steps in a
job run **in order**. If a step exits non-zero, later steps in that job
usually stop (the job fails).

---

## Runner

A **runner** is the machine that executes the job.

`runs-on: ubuntu-latest` is a GitHub-hosted VM. Every job starts **clean**:
no repo, no `node_modules`, no your laptop’s Playwright cache.

That is why Item 1 said “works on my machine” is not CI.

---

## Action (`uses`) vs `run`

| Keyword | Meaning |
|---|---|
| `uses` | Run a published **action** (JavaScript, composite steps, or a Docker image) |
| `run` | Run a shell command on the runner |

**Docker** here is only a packaging style: some actions ship as a container
image. You still write `uses: org/action@v1`. This lab’s actions are
JavaScript (`checkout`, `setup-node`). We do not write a Dockerfile.

Typical start of a Node workflow:

```yaml
- uses: actions/checkout@v7
- uses: actions/setup-node@v7
  with:
    node-version: "24.12.0"
    cache: npm
- run: npm ci
- run: npm run lint
- run: npm run typecheck
```

`checkout` clones the repo into the runner.  
`setup-node` installs Node (and can cache npm).  
`run` is **your** policy: lint, types, later tests.

---

## Repository workflow directory

```text
.github/workflows/*.yml
```

GitHub only auto-discovers workflows here. A YAML file in `docs/` does
nothing.

---

## YAML structure

```text
Workflow
  └── Jobs
       └── Steps
```

- Jobs can run independently (later: quality / tests / build).
- Steps inside one job run sequentially.
- Every hosted runner begins clean.

---

## `npm ci` vs `npm install`

| | `npm ci` | `npm install` |
|---|---|---|
| Lockfile | **Required**; installs that exact tree | May update the lockfile |
| `node_modules` | Deletes and reinstalls | Incremental / messy |
| CI | Correct default | Hides lockfile drift |
| Daily local coding | Optional (reset / match CI) | Yes |

`npm ci` fails if `package.json` and `package-lock.json` disagree. That is
what you want on a clean runner.

Cache (`setup-node` `cache: npm`) speeds **download**. It must not change
which versions `npm ci` installs.

---

## `push` vs `pull_request`

- **`pull_request`** — verify the proposed merge. This is the gate humans
  look at on the PR page.
- **`push` to `main`** — verify what actually landed (and later, what may
  deploy).

Both matter. A workflow that only runs on `main` lets broken PRs merge if
protection is missing. A workflow that only runs on PRs never re-checks
direct pushes to `main`.

---

## What this item does **not** run

Leave for later items:

- `npm test` — added in Item 3 ([`3-3-tests-in-ci.md`](./3-3-tests-in-ci.md))
- coverage upload / thresholds (Item 3 — no arbitrary threshold)
- job split + `npm run build` — added in Item 4
  ([`3-4-github-actions-jobs-and-cache.md`](./3-4-github-actions-jobs-and-cache.md));
  no `needs` yet
- Playwright browsers + artifacts (Item 5)
- Secrets (Item 6)
- Husky / branch protection (Item 7)
- Deploy (Item 8)

The first workflow should be **boring and green**, then we add gates.

---

## Typecheck script

```json
"typecheck": "tsc --noEmit"
```

CI calls `npm run typecheck`, not a one-off `npx tsc` with different flags.

`next build` also type-checks, but that is slower and belongs with the build
job (Item 4). Item 2 wants a **fast** type gate.

---

## In this project

| Piece | Value |
|---|---|
| Workflow | `.github/workflows/ci.yml` |
| Name | `CI` |
| Triggers | `pull_request`; `push` to `main` |
| Jobs | `quality`, `tests`, `build` on `ubuntu-latest` (no `needs`) |
| Actions | `actions/checkout@v7`, `actions/setup-node@v7` |
| Node | `24.12.0` (exact pin; same as this machine and `.nvmrc`) |
| Local pin | `.nvmrc` → `24.12.0` |
| Install | `npm ci` + `cache: npm` (each job) |
| Gates | lint + typecheck / `npm test` / `npm run build` (Items 2–4) |
| Local replica | `npm run ci` (same four commands, serial; not `npm ci`) |
| Local script | `"typecheck": "tsc --noEmit"` |
| Not in YAML | Playwright, `npm run verify` |
| Lint fixes for a green first run | `tailwind.config.ts` ESM plugin import; ESLint ignores `coverage/` |

The workflow is now three jobs: `quality` (lint + typecheck), `tests`
(Jest), `build` (`next build`). `npm run verify` (full PR sequence) is
**not** in `package.json` yet and must **not** be the workflow command —
it would pull Playwright in too early.

`npm ci` must use the same **npm** that wrote `package-lock.json`. A
floating `node-version: "24"` can install a newer 24.x (and a newer npm)
than this machine. The workflow and `.nvmrc` pin **24.12.0** so both
match.

### How to read a run

On GitHub: **Actions** tab, or the checks list on a pull request. Open the
`CI` workflow → a red **job** (`quality` vs `tests` vs `build`) is the
layer. Inside `quality`, a red step (`Lint` vs `Typecheck`) is the
command.

The file does nothing until it is on a branch GitHub can see (push / PR).

### How to run locally (same commands, your machine)

```bash
npm run ci
```

---

## Self-check

**What is the difference between a job and a step?**  
A job runs on a runner. Steps are the ordered commands/actions inside that
job.

**Why `npm ci` in the workflow?**  
The runner is empty. `npm ci` installs exactly the lockfile. `npm install`
can hide lockfile drift.

---

## Key insight

A CI workflow is executable repository policy.

If the repository says type errors are not allowed, the workflow should
prove that automatically.
