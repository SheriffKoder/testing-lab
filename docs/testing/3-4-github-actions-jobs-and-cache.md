# Jobs, Dependencies and Caching

> Phase 3 · Item 4 · Concepts + project wiring.
>
> Builds on [`3-3-tests-in-ci.md`](./3-3-tests-in-ci.md) and
> [`3-1-ci-checks-map.md`](./3-1-ci-checks-map.md).
>
> Next: Playwright in CI — Item 5. That item adds an e2e job and report
> artifacts. Do not add browsers here.

Item 2–3 keep **one** job so the first gates are easy to read. Item 4
asks whether that job should stay one column or become several, and adds
**`npm run build`**. Playwright stays **out** (Item 5).

The phase goal:

> CI should provide fast, understandable feedback.

More jobs are not automatically better architecture. Split when it
improves parallelism, isolation, or clarity.

---

## Multiple jobs

A **job** is one runner. Two jobs mean two VMs (or two billed slices of
the same hosted pool). Each starts **clean**: checkout and `npm ci`
again unless you pass files between them on purpose.

Item 2–3:

```text
CI
└── verify
    lint → typecheck → test
```

This item’s split:

```text
CI
├── quality     lint + typecheck
├── tests       Jest + RTL
└── build       next build
```

Those three can start together (parallel) or wait on each other
(`needs`).

---

## Parallel execution

Jobs with **no** `needs` start as soon as a runner is free. Lint does
not wait for Jest. A type error and a test failure can appear in the
same run, in different logs.

Cost: duplicated setup (`checkout`, `setup-node`, `npm ci`) on every
job. For a small repo that extra minute can outweigh the parallelism.

---

## `needs` (job dependencies)

```yaml
jobs:
  quality:
    # ...
  tests:
    needs: quality
  build:
    needs: [quality, tests]
```

`needs` means: do not start this job until the listed jobs **succeeded**.
If `quality` fails, `tests` and `build` are skipped (unless you set
special `if:` conditions).

Use `needs` when later work is pointless or expensive after an early
fail (do not compile Next if types are already broken). Skip `needs`
when you want **all** signals in one run (see lint *and* the failing
test).

---

## Why jobs may be split

| Reason | What you gain |
|---|---|
| **Fast feedback** | A 10s lint failure does not sit behind a 2min test job |
| **Failure isolation** | The PR check name is `tests` vs `build` — you know the layer |
| **Parallelism** | Independent work overlaps |
| **Different setup** | Later: Playwright needs browsers; quality does not |

If the whole pipeline is still ~1 minute and one log is easy, **keep
one job**. Do not split for the diagram.

---

## One job vs three — tradeoffs

| | One `verify` job | Separate `quality` / `tests` / `build` |
|---|---|---|
| Simplicity | One log, one setup | Three YAML blocks |
| Parallelism | None (steps are serial) | Jobs can overlap |
| Duplicated setup | Once | `npm ci` per job |
| Debugging | Scroll to the red **step** | Red **job** name is the layer |
| Branch protection later | One required check | Must require each job |

Item 4’s build step is the reason to consider a split: `next build` is
slower and catches things Jest does not. Isolating it makes a “tests
passed, compile failed” story obvious.

---

## Why `npm run build` belongs in CI

`tsc --noEmit` checks types. Jest checks behavior in jsdom. **`next
build`** compiles the App Router app for production: unused imports that
break the bundler, server/client boundary mistakes, missing files, some
type errors `tsc` and tests never execute.

A change can keep tests green and still fail the production compile.
That is the Item 4 verification: break something tests do not catch,
confirm **build** goes red.

Do not treat the host (Vercel, etc.) as the first place `next build`
runs. CI should fail the PR first.

---

## Caching

A **cache** stores files so a **later** run can skip re-downloading
them. This repo already uses:

```yaml
- uses: actions/setup-node@v7
  with:
    node-version: "24.12.0"
    cache: npm
```

`cache: npm` keys off `package-lock.json`. Same lockfile → restore the
npm download cache → `npm ci` is faster. Different lockfile → miss →
full download.

**Cache must not change correctness.** `npm ci` still installs the
lockfile. A warm cache is not a substitute for the lockfile, and not a
reason to run `npm install` in CI.

If you split jobs, **each job** that runs `npm ci` should keep
`cache: npm`. They share the same cache key space for that workflow.

---

## Cache keys (mental model)

GitHub hashes inputs (here, the lockfile) into a **key**. Hit: restore.
Miss: install, then save. You rarely write the key by hand with
`setup-node` `cache: npm`. You would with `actions/cache` for custom
paths.

A cache from `main` can be restored on a PR if the lockfile matches.
That is intended.

---

## Artifacts vs caches

| | **Cache** | **Artifact** |
|---|---|---|
| Purpose | Speed **future** runs | Keep output of **this** run |
| Typical | npm package tarballs | coverage HTML, Playwright report, `.next` |
| Who consumes it | Later jobs / later workflow runs | Humans, or a later job in the **same** run |
| Correctness | Must not change what was installed | Evidence or an input to deploy |

Examples:

```text
Cache     → npm dependency cache
Artifact  → coverage report, Playwright report, build output
```

Item 4 leaves coverage upload off. Playwright reports are Item 5. Do
not upload secrets. Do not treat `.next` as a deploy pipeline yet
(Item 8).

---

## What this item does **not** do

- Playwright job + browser install (Item 5)
- Secrets / `.env.example` (Item 6)
- Required checks / Husky (Item 7)
- Deploy on green (Item 8)
- Run `npm run verify` in YAML (still includes e2e)

`npm run verify` can stay **unadded** until e2e is in the PR sequence
(Item 5), or you add it later with the full chain. Do not hook it to
the workflow.

---

## In this project

| Piece | Value |
|---|---|
| Workflow | `.github/workflows/ci.yml` |
| Topology | **B** — three jobs: `quality`, `tests`, `build` |
| `needs` | **None** — all three start together |
| Node | `24.12.0` (`.nvmrc` + `setup-node` on every job) |
| Cache | `cache: npm` on every job (lockfile key) |
| Gates | lint + typecheck / `npm test` / `npm run build` |
| Local replica | `npm run ci` → lint + typecheck + test + build (serial) |
| Artifacts | **None** |
| Not in YAML | Playwright, `npm run verify` |

```text
CI
├── quality   checkout → Node → npm ci → lint → typecheck
├── tests     checkout → Node → npm ci → test
└── build     checkout → Node → npm ci → build
```

`npm run ci` matches that **command list** on your machine. It cannot
parallelize three runners; it runs the same four commands in order. It
is **not** `npm ci` (the lockfile install).

`npm run verify` (full PR sequence: also e2e) is still **not** in
`package.json` and must **not** be the workflow command.

`cache: npm` speeds download. Correctness still comes from `npm ci`.
A cache is for later runs. An artifact would keep this run’s output
(coverage, Playwright report) — not used here.

`npm run build` is now a PR and `main` gate. Playwright stays Item 5.

The invoices page keeps the Supabase fetch behind `<Suspense>`, so
`next build` can compile the static shell without `.env`. Request-time
data still needs env (Item 6).

### How to read a run

On GitHub: **Actions** tab, or the PR checks list → `CI`.

| Red job | Layer |
|---|---|
| `quality` | ESLint or `tsc --noEmit` (open the job for Lint vs Typecheck) |
| `tests` | Jest + RTL |
| `build` | `next build` |

Because there is no `needs`, a red `quality` does **not** skip `tests`
or `build`. You can see more than one layer fail in the same run.

On a **second** push with an unchanged lockfile, Setup Node should
mention a cache restore (hit). The first run after a new key can miss.

### How to run locally

```bash
npm run ci
```

Same four commands as the YAML, serial on your machine. CI still
starts each job from `npm ci` on a clean runner.

---

## Self-check

**Why three jobs instead of one `verify`?**  
`next build` is slower and catches things Jest does not. A red **job**
name is the layer. Lint and tests can fail in the same run.

**Does `cache: npm` replace `npm ci`?**  
No. The cache speeds download. `npm ci` still installs the lockfile.

**Why no `needs`?**  
So a lint fail and a test fail can both show. Chaining everything
serially deletes the point of multiple jobs.

---

## Key insight

CI should provide fast, understandable feedback.

More jobs are not automatically better architecture.

Split jobs when doing so improves parallelism, isolation, or clarity.
