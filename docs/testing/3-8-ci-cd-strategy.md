# Deployment Pipeline and Complete CI/CD Strategy

> Phase 3 · Item 8 · Concepts + project wiring.
>
> Builds on [`3-7-git-guardrails.md`](./3-7-git-guardrails.md).
>
> Phase wrap: CI proves; the host ships; maturity is the process, not
> YAML trivia.

Items 2–7 verify every PR and refuse a red merge. Item 8 is how
**verified** code becomes a running URL — and how to read a failure
at the right layer.

The phase goal:

> CI/CD maturity is not knowing YAML syntax.
>
> It is designing a development process where unsafe changes are
> caught early, important checks are enforced consistently, and
> verified code can move toward production predictably.

Do not build a custom deploy system so the lab can “have CD.” This
app is a Next.js starter meant for **Vercel**. GitHub Actions
**proves**; the host **ships**. This pass documents that map;
**Vercel is not connected yet** — connect later without changing
`ci.yml`.

---

## Build artifact

A **build artifact** is the output of compiling the app for a
target: `.next/` from `npm run build`, a Docker image, a zip.

This lab:

- CI `build` job runs `next build` so a compile error **blocks
  merge** (Item 4). That job’s `.next` is **not** what Vercel
  deploys. It is a **gate**, not a hand-off.
- Vercel runs its **own** `next build` on its machines with **its**
  env.

Two compiles is normal. Do not upload `.next` from Actions and
invent a second deploy path.

Contrast with a **cache** (Item 4): cache speeds a *later* run;
an artifact is *this* run’s output. Playwright’s HTML report is an
artifact. Vercel’s deployment is a host artifact, not an Actions
upload.

---

## Deployment

**Deployment** means that compiled app becomes reachable (a URL,
or production traffic).

It is not another test runner. Jest and Playwright already ran on
the PR. Deployment **uses** that confidence; it should not be the
first place you learn the types are wrong.

---

## Preview vs production

| | **Preview** | **Production** |
|---|---|---|
| Typical trigger | Open / update a PR | Merge to `main` |
| Audience | Author, reviewers | Users |
| URL | Unique per PR (Vercel preview) | The project’s production domain |
| Data | Same or staging backend | Production backend |
| This lab | Vercel Git integration (when connected) | Vercel on `main` (when connected) |

Playwright in this lab still hits **`webServer` + localhost +
Supabase**, not the preview URL
([`3-5-playwright-in-ci.md`](./3-5-playwright-in-ci.md)).
Do not add a second e2e job against Vercel “for completeness.”

---

## Continuous Delivery vs Continuous Deployment

Same as Item 1; now attached to a host:

| | **Continuous Delivery** | **Continuous Deployment** |
|---|---|---|
| After CI | Always **ready** to ship | **Shipped** |
| This lab + Vercel on `main` | If you promote / click | If every green merge to `main` goes live |

Vercel’s default Git integration is closer to **deployment**: merge
to production branch → Vercel builds and ships. The **gate** is
Item 7: you cannot merge (so you cannot prod-deploy) until CI is
green — administrators included.

Preview deploys often start **in parallel with** CI. A preview can
exist while `e2e` is still running. That is the host being helpful,
not a bug. Production is what branch protection actually protects.

---

## Deployment gates

A **deployment gate** is a condition that must hold before traffic
moves.

This lab’s realistic gate:

```text
Required CI jobs green
        ↓
Merge to main allowed
        ↓
Vercel production deploy   ← when the host is connected
```

Not this lab: a GitHub `environment: production` with a required
reviewer, a second Actions deploy job, blue/green, canary. Those
are real strategies; they are extra infrastructure.

---

## Rollback

**Rollback** means putting the previous good deployment back in
front of users.

On Vercel: redeploy a previous deployment (Instant Rollback /
deployments list). The git story is: revert the bad commit on
`main` and let CI + Vercel run again.

Do not SSH into a runner. Do not “fix forward” only in the Vercel
dashboard while `main` stays broken — the next merge will ship
`main` again.

---

## Environment-specific configuration

Same **names** as Item 6. Different **stores**:

```text
Local       .env
CI e2e      GitHub repository secrets
Preview     Vercel Preview env     (when connected)
Production  Vercel Production env  (when connected)
```

`NEXT_PUBLIC_*` is inlined at **that** environment’s compile. A
preview build uses Vercel Preview values; production uses
Production values. Changing a host env var requires a **rebuild**
to show up in the client bundle.

Do not put a service-role key in the host’s browser-visible env.
Do not paste keys into `ci.yml` to “help” deploy.

---

## GitHub vs GitHub Actions vs Vercel

```text
GitHub
  → stores git; PRs; branch protection; secrets UI

GitHub Actions
  → runs CI (quality / tests / build / e2e)
  → does not deploy this app

Vercel (planned host)
  → watches the GitHub repo
  → preview per PR, production on main
  → runs its own next build
  → holds host env
```

```text
Pull Request
   ↓
GitHub Actions (verify)     Vercel preview (optional; often parallel)
   ↓
Merge allowed when checks green
```

```text
Merge to main
   ↓
CI passes (also on push to main)
   ↓
Vercel production (when connected)
```

Actions does **not** need a `deploy` job. The host already deploys
from git. Adding `vercel deploy` in YAML duplicates the
integration and needs a Vercel token in Actions — extra secret,
extra failure mode, no extra learning for this lab.

---

## Why deploy only after relevant verification

A host that ships every push to `main` without required checks will
happily production-deploy a red Playwright. The **process** is:

1. Tests and build on a clean machine (Actions).
2. Merge only if those jobs are required (Item 7).
3. Host builds what was merged.

Skip 2 and CI is a dashboard decoration.

---

## Target architecture (this lab)

```text
Developer
    ↓
Husky (lint staged)          ← skippable
    ↓
Push branch
    ↓
Pull Request
    ↓
GitHub Actions
    ├── quality   lint + typecheck
    ├── tests     Jest + RTL
    ├── build     next build
    └── e2e       Playwright
          ↓
     All required checks pass
          ↓
      Merge allowed
          ↓
       main
          ↓
       Vercel production   ← connect host later; no YAML change
```

Local `npm run verify` is the same command list, serial, optional,
not a hook, not YAML.

---

## Debugging by layer

When something is red, name the **job** (or the hook) before
opening Cursor.

| Failure | Where | What you open |
|---|---|---|
| Lint | Husky or `quality` | ESLint output |
| Jest | `tests` | Assertion + stack |
| `next build` / `tsc` | `quality` or `build` | Type or compile error; tests may stay green |
| Playwright | `e2e` | Log, then `playwright-report` artifact / `trace.zip` |
| Missing env | `e2e` webServer | `Missing Supabase env vars…` — not “Supabase is down” |

This PR’s history already has real examples (Jest demo, lockfile /
`npm ci`, missing e2e env). Tip of the branch should stay green;
do not stockpile new red commits for screenshots.

---

## Automation layer (strategy table)

Phase 1’s coverage doc asked *what is worth a unit test.* This item
adds **when automation runs**:

| Concern | Local | CI | Deployment |
|---|---|---|---|
| Formatting | If you care | No | No |
| Lint | Yes (hook + `npm run lint`) | Yes (`quality`) | No |
| Type checking | Maybe (`typecheck`) | Yes (`quality`) | No (host compile is separate) |
| Jest / RTL | Yes | Yes (`tests`) | No |
| Playwright | When needed | Yes (`e2e`) | No (not against prod URL) |
| Next.js build | Sometimes | Yes (`build`) | **Required** on the host |
| Full PR gate | `npm run verify` (opt-in) | Yes (four jobs) | No |
| Deployment | No | No | Yes (Vercel when connected) |

Coverage **percentage** stays off the merge gate
([`1-8-testing-strategy.md`](./1-8-testing-strategy.md)).

---

## What this item does **not** do

- A GitHub Actions deploy job or Vercel token in secrets
- Playwright against the preview / production URL
- New test framework
- Kubernetes, Docker production images, Terraform
- Replacing Item 7’s protection with “Vercel will fail the build”
- Requiring Vercel to be live before merging this phase PR

---

## In this project

| Piece | Value |
|---|---|
| Verify | `.github/workflows/ci.yml` — `quality`, `tests`, `build`, `e2e` |
| Deploy job in Actions | **None** — by design |
| `VERCEL_TOKEN` | **Not** in repository secrets |
| Merge gate | Item 7: PR + four required checks; admins enforced |
| Host | **Vercel** planned; **not connected** in this pass |
| Host env (when connected) | Same two names as local / CI; Preview + Production scopes |
| Playwright | Still `webServer` + localhost + Supabase secrets on `e2e` |
| Local full sequence | `npm run verify` — opt-in; not YAML |

```text
Local     .env
CI e2e    GitHub repository secrets
Preview   Vercel Preview env     ← deferred
Production Vercel Production env ← deferred
```

Until Vercel is imported: merge to `main` still re-runs CI on
`push`. There is no production URL from this repo yet. Connecting
Vercel later is Settings on the host + the two `NEXT_PUBLIC_*`
names — still no change to `ci.yml`.

### How to read a failure

| Red signal | Layer |
|---|---|
| Husky / `quality` ESLint | Lint |
| `tests` | Jest + RTL |
| `quality` typecheck or `build` | Types / `next build` |
| `e2e` + artifact | Playwright |
| `e2e` `[WebServer] Missing Supabase…` | Env wiring (Item 6) |
| Vercel build log (later) | Host compile / host env — not an Actions job |

### How to run locally

```bash
npm run verify          # full PR sequence on your machine
npm run ci              # same five commands
```

Neither script deploys.

---

## Self-check

**Does CI deploy this app?**  
No. Actions verifies. The host ships when connected.

**Why no `needs: deploy` in YAML?**  
Production is gated by **merge** (required checks), not by an
Actions deploy job that waits on the other jobs.

**Is Vercel required to finish the mental model?**  
No. Document the map; connect the host when you want a URL.

---

## Key insight

CI/CD maturity is not knowing YAML syntax.

It is designing a development process where unsafe changes are
caught early, important checks are enforced consistently, and
verified code can move toward production predictably.
