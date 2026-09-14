# Husky, Local Git Hooks and Branch Protection

> Phase 3 · Item 7 · Concepts + project wiring.
>
> Builds on [`3-6-ci-secrets-and-environments.md`](./3-6-ci-secrets-and-environments.md).
>
> Next: deploy and the full CI/CD strategy — Item 8.

Items 2–6 made lint, types, Jest, Playwright, and build run on every
PR, with secrets out of git. Item 7 connects that pipeline to **how
people actually commit and merge**.

The phase goal:

> Use local hooks for fast feedback.
> Use CI for enforcement.
> Use branch protection to connect CI results to the team's actual
> development process.

Without this item, a red `e2e` job is only a warning. Anyone with
write access can still merge. Anyone can still commit a lint error
without noticing until GitHub.

---

## Two different problems

| Problem | Tool |
|---|---|
| I am about to commit something silly | **Git hook** (Husky) on my laptop |
| Broken code must not become `main` | **CI + branch protection** on GitHub |

They look similar (“don’t let bad code through”). They are not
interchangeable.

---

## Git hooks

A **hook** is a script Git runs at a named moment in *your* repo
clone. Classic location: `.git/hooks/`. Those files are **not**
shared — each clone has its own.

Useful moments for this lab:

| Hook | When | Typical use |
|---|---|---|
| **pre-commit** | After `git commit` is typed, before the commit object exists | Lint the files about to be committed |
| **pre-push** | After `git push` is typed, before objects go to GitHub | Optional slower check |

If the script exits non-zero, Git **aborts**. The commit or push does
not happen.

Other hooks exist (`commit-msg`, `post-merge`). This item only needs
pre-commit.

---

## Why hooks should remain fast

You run pre-commit **many times a day**. A 30-second hook gets
disabled. A 10-minute hook (`npm run verify`, Playwright, `next
build`) will be skipped with `--no-verify` on the first busy
afternoon.

Rule:

```text
pre-commit  → seconds (staged files)
pre-push    → optional; still not the full PR gate
CI          → minutes (clean runner, all jobs)
```

`npm run verify` stays an **opt-in** local command. Do not attach it
to pre-commit.

---

## Husky

**Husky** is a small tool that stores hooks in a tracked folder
(`.husky/`) and installs them when someone runs `npm install` /
`npm ci` (via a `prepare` script).

What it does:

- versions the hook scripts with the rest of the code
- points Git at `.husky/` so every clone gets the same pre-commit
- does **not** run on GitHub’s runner as a substitute for CI

Why teams use it: shared, boring, early feedback. A lint error dies
on the laptop instead of in a 4-minute `quality` job.

Why it is **not** CI:

| | Husky | GitHub Actions |
|---|---|---|
| Where | Author’s machine | Clean runner |
| Who can skip it | Anyone (`--no-verify`, no `npm install`, broken `prepare`) | Workflow must be disabled or permissions abused |
| Environment | Whatever is on the laptop | Lockfile + pinned Node |
| Purpose | Convenience | Enforcement |

---

## Hooks can be bypassed

```bash
git commit --no-verify
git push --no-verify
```

That is a feature, not a bug: a broken hook must not trap a hotfix
forever. It is also why Husky cannot be the merge gate.

Other bypasses: not running `npm install` (no `prepare`), deleting
`.husky/`, `HUSKY=0`.

Assume a motivated person can skip local hooks. Design CI + branch
protection as if they will.

---

## lint-staged

`eslint .` lints the **whole** tree. On a large repo that is slow and
noisy: you pay for files you did not touch.

**lint-staged** runs a command only on **staged** paths that match a
glob.

```text
Only changed files
```

This lab: staged `*.{js,jsx,ts,tsx}` → `eslint` (no `--fix` in the
hook). A lint problem **fails the commit**. Auto-fix stays a command
you run on purpose, so the verification “commit with a lint error”
is visible.

Do not run Jest, Playwright, or `tsc` on every commit via
lint-staged. Typecheck and tests belong in CI (`quality` / `tests`).

An unused variable is often only a **warning** here (`exit 0`). The
hook fails on ESLint **errors** (`no-var`, `any`, …).

---

## Branch protection

**Branch protection** (classic rules or repository **rulesets**) is
GitHub Settings, not a file in the repo. YAML cannot turn it on.

It answers: *what must be true before `main` changes?*

Typical knobs for this lab:

| Setting | Why |
|---|---|
| Protect `main` | Production-ish branch |
| Require a pull request | No casual `git push origin main` |
| Require status checks | The CI **jobs** must be green |
| Include administrators | You (owner) cannot merge a red PR “because I can” |
| Reviews | Optional here; a solo lab can skip required reviewers |

**Required status checks** are the job names from `.github/workflows/ci.yml`,
not the workflow filename:

```text
quality
tests
build
e2e
```

The PR UI may show them as `CI / quality`. Pick the names GitHub
lists after a run exists. Requiring only `quality` would let a red
`e2e` merge.

Until these boxes are checked, Items 2–6 are **information**. After,
they are **policy**.

Settings is **admin / owner**. Write collaborators do not edit the
rule. They still see a blocked merge and required checks on the PR.

`CODEOWNERS` is a tracked file (path → reviewers). This lab does
**not** use it. Anyone can *propose* an edit; it only becomes a
merge lock if “require review from code owners” is on **and** the
file lists owners for itself.

---

## Husky vs GitHub Actions

```text
Husky
→ local convenience / early feedback

GitHub Actions
→ centralized enforcement

Branch protection
→ merge is not allowed until that enforcement is green
```

```text
Developer
    ↓
pre-commit (lint staged)     ← skippable
    ↓
push / PR
    ↓
CI jobs                      ← not skippable by --no-verify
    ↓
required checks
    ↓
merge to main
```

---

## What this item does **not** do

- Add a fifth CI job
- Hook `npm run verify` or Playwright to pre-commit
- Deploy / Vercel (Item 8)
- Required code owners or a two-person review rule
- Pretend hooks cannot be bypassed

---

## In this project

| Piece | Value |
|---|---|
| Husky | `^9.1.7` — `"prepare": "husky"` |
| Hook | `.husky/pre-commit` → `npx lint-staged` |
| lint-staged | `*.{js,jsx,ts,tsx}` → `eslint` (no `--fix`) |
| Not a hook | `npm test`, `test:e2e`, `build`, `verify`, no `pre-push` |
| Workflow | unchanged — still four jobs, no `needs` |
| Required checks | `quality`, `tests`, `build`, `e2e` (**required**) |
| Protection | Classic rule on `main` — **enforced** (repo is public) |
| Reviews | 0 required approvals; no `CODEOWNERS` |
| Bypass | `git commit --no-verify` skips Husky; CI still runs; admins cannot bypass the rule |

```text
prepare (npm install / npm ci)
    → husky sets core.hooksPath

git commit
    → .husky/pre-commit
    → npx lint-staged
    → eslint on staged *.{js,jsx,ts,tsx}
```

`.husky/_/` is generated locally (`prepare`). Only `.husky/pre-commit`
is tracked.

`husky init` wrote `npm test` in the hook. That was replaced.
Jest is still the `tests` job, not pre-commit.

### Branch protection (Settings, not git)

Owner path: **Settings → Branches → Add classic branch protection
rule**. Rulesets on a personal Free **private** repo stay “not
enforced” until Team/Pro; this lab made the repo **public** so
classic protection applies.

| Knob | This lab (live) |
|---|---|
| Pattern | `main` |
| Require a pull request | On |
| Required approvals | **0** |
| Require status checks | `quality`, `tests`, `build`, `e2e` |
| Enforce admins / no bypass | On |
| CODEOWNERS / conversation resolution | Off |
| Strict “up to date” | Off |

A red required check blocks merge. Direct `git push origin main` is
rejected in the normal path.

### How to tell hook fail from CI fail

| What you see | Meaning |
|---|---|
| `✖ eslint` / `husky - pre-commit script failed` | Local hook. Commit was not created. |
| `quality` red on GitHub after `--no-verify` | Hook skipped. CI still linted. |
| Merge disabled on a red required check | Protection is policy. |
| Merge still allowed on a red `e2e` | Protection missing or that job not required. |

### How to run locally

```bash
# hook runs on git commit (staged ts/tsx/js/jsx only)
git commit

# skip Husky — CI quality still runs if you push
git commit --no-verify

# full PR sequence — opt-in, not a hook
npm run verify
```

---

## Self-check

**Is Husky only for lint?**  
Husky runs whatever is in `.husky/`. This lab puts **lint-staged →
eslint** there because that stays fast. Tests stay in CI.

**Why not run `npm test` on pre-commit so CI is quieter?**  
CI still runs the tests on a clean runner. A slow hook gets
`--no-verify`. Laptop green is not runner green.

**Can collaborators edit Settings?**  
No — admin / owner. They still see required checks on the PR.
`CODEOWNERS` is a git file; changing it is a PR, not Settings.

---

## Key insight

Use local hooks for fast feedback.

Use CI for enforcement.

Use branch protection to connect CI results to the team's actual
development process.
