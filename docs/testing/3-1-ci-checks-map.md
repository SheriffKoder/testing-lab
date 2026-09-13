# CI Checks Map

> Phase 3 · Item 1 · Decision table (when each command runs).
>
> Concepts live in [`3-1-ci-cd-mental-model.md`](./3-1-ci-cd-mental-model.md).
>
> Layer choice (Jest / RTL / Playwright) is already decided in
> [`2-8-playwright-debugging-and-strategy.md`](./2-8-playwright-debugging-and-strategy.md).
> This doc only says **when** those commands run — not which layer to use.
>
> **Local + PR is the merge gate.** Main re-runs the same CI. Deploy ships
> the verified build. These are moments, not four extra testing phases.
>
> Local replica of **today’s** YAML: `npm run ci` (lint + typecheck + test).
> Full PR sequence `npm run verify` is not added yet. Workflow:
> [`3-2-github-actions-basics.md`](./3-2-github-actions-basics.md),
> [`3-3-tests-in-ci.md`](./3-3-tests-in-ci.md).

This table answers a different question than Phase 1–2:

| Earlier docs | This doc |
|---|---|
| What is worth a unit test? Which layer? | When should this **command** run? |

Status: **Exists** = script already in `package.json`. Workflow is
**partial** until Items 4–5 (`build`, e2e). Jest is in CI (Item 3).

---

## How to read the buckets

The path that unlocks merge:

```text
Local (optional, fast)
        ↓
Pull request CI (the gate)
        ↓
Merge
```

**Local** — You run these on your laptop while coding. Fast feedback.
Skippable. Husky (Item 7) can remind you; it cannot replace CI.

**Pull request** — Clean runner, lockfile install. This is what later
**blocks merge** (Item 7: required checks). Same commands as a careful
local run; the difference is they cannot be forgotten.

**Main** — The **same** PR gates again on the commit that landed. Do not
weaken them. After they pass, deployment may start (Item 8 / host).

**Deployment** — The host compiling and shipping (`next build`). Not a
second Jest/Playwright suite. This lab’s Playwright hits local `webServer`
+ Supabase — do not invent a production-URL E2E job.

A command can appear in more than one bucket (`npm test` locally **and**
on the PR). That is one check, two moments.

---

## Local developer checks

Fast feedback. Can be skipped. Not what unlocks merge.

| Command | Why | Status |
|---|---|---|
| `npm run lint` | Catch style / Next lint errors before the PR | Exists |
| `npm run typecheck` | Fast `tsc --noEmit` while editing | Exists |
| `npm test` | Jest + RTL, once, non-watch | Exists — **CI in Item 3** |
| `npm run ci` | Local replica of current YAML (lint + typecheck + test) | Exists |
| `npm run test:watch` | Same suite while iterating — **not** a gate | Exists |
| `npm run test:e2e` | When you touch invoice journeys | Exists |
| `npm run test:e2e:headed` / `test:e2e:ui` | Debug a red E2E — watch / scrub | Exists |
| `npm run test:coverage` | Spotlight uncovered files (Phase 1) — no threshold | Exists |
| `npm run verify` | Optional CI-like pass before push (full PR sequence) | Not added — do not confuse with the CI **job** `verify` |
| Husky pre-commit (lint staged files) | Remind before commit; still bypassable | Item 7 — do not install now |

---

## Pull request checks

Full validation. Later **required** before merge.

| Command | Why | Status |
|---|---|---|
| `npm run lint` | Agreed lint must not land | Exists — **CI in Item 2** |
| `npm run typecheck` | Type errors must not land | Exists — **CI in Item 2** |
| `npm test` | Jest + RTL; non-watch; failed tests fail the job | Exists — **CI in Item 3** |
| `npm run test:e2e` | Playwright journeys (Chromium, `CI=true` retries) | Exists — CI in Item 5 |
| `npm run build` | Next production compile; catches what tests miss | Exists — CI in Item 4 |

The `verify` **job** is lint + typecheck + Jest. Do **not** run
`npm run verify` in the YAML — that script (not added yet) includes
Playwright and `build` (Items 4–5). Use `npm run ci` locally for today’s
gates.

`npm run ci` (local) matches the current job. `npm run verify` (later) is
the full PR sequence. The job name `verify` is not that script.

---

## Main branch checks

Same as the PR. Do not run fewer gates on `main`.

| Command | Why | Status |
|---|---|---|
| Lint, typecheck, Jest, Playwright, build | Prove what actually landed, not only the PR head | Same as PR (Items 2–5) |
| Deploy trigger | After green CI — host or Actions | Item 8 |

`push` to `main` is why the workflow will listen to `main` as well as
`pull_request`. Direct pushes should not skip the gate.

---

## Deployment checks

Shipping, not a new test runner.

| Command | Why | Status |
|---|---|---|
| `npm run build` | Host must compile the app | Exists — host + Item 4 CI |
| Playwright against the **deployed** URL | Optional later; not this lab’s setup | **Skip** — E2E uses `webServer` + Supabase |

Preview deploys (per PR) may run in parallel with CI. They do **not**
replace the PR gate.

---

## Not a check

| Command / idea | Why |
|---|---|
| `npm run dev` / `npm start` | Servers, not verification |
| `npm run test:watch` | Interactive; CI must exit | 
| `test:e2e:headed` / `test:e2e:ui` | Local debug only |
| Coverage **percentage** as a failing gate | Spotlight, not a score ([`1-8-testing-strategy.md`](./1-8-testing-strategy.md)) |
| A second “integration” test runner | Jest already owns mocked wiring; Playwright owns real persist |

---

## When, not everything, every time

```text
Pre-commit (Item 7)
→ very fast (lint staged files)

Local `npm run verify` (optional)
→ same sequence as the pull-request gate

Pull request
→ full validation (the merge gate)

Main
→ same validation + allow deploy
```

Do not hook `verify` to pre-commit — Jest + Playwright + build are too slow
for every commit.

---

## Align with Phase 1–2

| Earlier decision | What this map does with it |
|---|---|
| Coverage is a **measurement**, not a score ([`1-8-testing-strategy.md`](./1-8-testing-strategy.md)) | `test:coverage` is local / optional report. No % threshold as a merge gate. |
| Inventory ranks *what* is worth a unit test ([`1-8-testing-inventory.md`](./1-8-testing-inventory.md)) | CI does not add new unit cases. It **runs** `npm test`. |
| Layer choice Jest / RTL / Playwright ([`2-8-playwright-debugging-and-strategy.md`](./2-8-playwright-debugging-and-strategy.md)) | CI does not pick a new layer. `npm test` runs Jest+RTL; `test:e2e` runs Playwright. |
| Playwright already reads `CI=true` (`retries`, `forbidOnly`, no server reuse) | Item 5’s job sets `CI`; config is already ready. |
| Soft unit gaps / “Nice” items | Still optional Jest polish — **not** extra CI jobs. |
| No second integration runner | Jest owns mocked wiring; Playwright owns real persist. |

Item 3 automates **lint + typecheck + Jest**. Naming build and e2e here is
the reminder to add those jobs later — not permission to skip them.

---

## Self-check

**Do I have to run every local command before every push?**  
No. Run the command that matches the change. Use `npm run verify` (once it
exists) when you want the full PR sequence. The PR is still the gate.

**Does `npm run verify` replace CI?**  
No. It is the same commands on **your** machine. CI proves them on a clean
runner with `npm ci` for every PR.

---

## Key reminder

- **Local** = convenience.
- **PR** = the gate that unlocks merge.
- **Main** = the same gate on the landed commit.
- **Deploy** = ship the verified build.

CI is not another testing tool. It is when these commands become
unavoidable.
