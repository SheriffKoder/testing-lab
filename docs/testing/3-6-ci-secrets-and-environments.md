# Secrets, Environment Variables and Environments

> Phase 3 · Item 6 · Concepts + project wiring.
>
> Builds on [`3-5-playwright-in-ci.md`](./3-5-playwright-in-ci.md).
>
> Next: Husky and branch protection — Item 7.

Item 5 can run Playwright only if the runner sees Supabase config.
Item 6 is why those values are not in git, what is public vs privileged,
and which job needs which names. It is a **safety review**, not a new
CI gate.

The phase goal:

> Treat pipeline credentials as part of application security, not merely
> configuration.

CI/CD can reach the same backend as production. A leaked workflow file
is a leaked key.

---

## Application config vs secret credentials

**Application config** — names and non-sensitive defaults that tell the
app *how* to run. Safe to list in `.env.example`.

**Secret credentials** — values that grant access. They belong in a
local git-ignored `.env` and in the host’s secret store (GitHub
Actions, Vercel). Never in YAML, never in tracked docs, never in a
screenshot of a PR.

The **name** is not the secret. `.env.example` has names. `.env` has
values.

---

## Public vs private values

| Kind | Example | Browser? | Git? |
|---|---|---|---|
| Public client config | `NEXT_PUBLIC_SUPABASE_URL` | Yes (bundled) | Names only |
| Public-but-project | publishable / anon key | Yes (by design) | Names only — still do not commit the value |
| Privileged | service role, DB password | **Never** | **Never** |

“Public” means the **browser is allowed to see it**. It does not mean
“commit the production project’s key to GitHub.” Anyone with the
publishable key can call *your* Supabase as the anon role (RLS is the
real door). Treat the value as project-specific, not as a password for
the dashboard.

---

## Next.js `NEXT_PUBLIC_*`

Next inlines any `NEXT_PUBLIC_*` variable into the **client bundle**.
Assume every user can read it.

Rules:

- Only prefix values the client must have.
- Never prefix a service-role key, database URL with a password, or
  webhook secret.
- Changing a `NEXT_PUBLIC_*` value requires a **rebuild**. CI `next
  build` and Vercel both bake the value that was in the environment at
  compile time.

This lab’s server Supabase helper uses the publishable pair.
There is **no** service-role key in the app — keep it that way.

---

## GitHub Actions secrets and variables

| Store | Visibility | Use |
|---|---|---|
| **Secret** | Masked in logs; write-only in the UI | Keys, tokens, publishable key, URL if you do not want Settings to show it |
| **Variable** | Visible to anyone who can read repo settings | Non-secret config |
| **`env:` in YAML** | In the file / log if you hardcode it | Only `${{ secrets.* }}` / `${{ vars.* }}` |

The runner’s environment is empty until you set this. A local `.env`
is **not** checked out (gitignored). Collaborators learn **names** from
`.env.example` (or the code). CI injects **values** they cannot open in
Settings.

Do not `echo` secrets. Fork PRs do not get repo secrets by default —
that is intentional. Write access can still change the workflow, so
secrets hide casual viewing, not a collaborator you already trust to
push YAML.

---

## CI environments (GitHub) vs app environments

**GitHub Environments** (Settings → Environments) are named buckets
(`preview`, `production`) with their own secrets and optional
protection rules (required reviewers). YAML must set `environment:` to
use them. This lab does **not**.

**App environments** are how the product runs:

| Name | What it is |
|---|---|
| **Development** | Laptop: `.env`, `next dev`, Playwright `webServer` |
| **CI** | GitHub runner: Actions secrets, `npm ci`, e2e against this lab’s Supabase |
| **Preview** | Host deploy of a PR (Vercel). Item 8. |
| **Production** | Host deploy of `main`. Item 8. |

This item documents the map. It does not require creating GitHub
Environments. Item 8 uses the host’s env.

---

## Why credentials must never be hardcoded in workflow files

YAML is git. Git is copied, forked, and logged. A key in `ci.yml`
survives in history after you delete the line.

Rotation means: revoke the old value in Supabase (or the host), put
the new value in Actions / Vercel / `.env`, and treat the old git
history as compromised if it ever contained the value.

---

## Least privilege

Give CI the **smallest** credential that makes the check true.

| Check | Needs |
|---|---|
| lint / typecheck / Jest | None (mocks) |
| `next build` (this app) | None today (Suspense shell compiles without env) |
| Playwright | Publishable URL + key (real `tl_invoices`) |
| Deploy (Item 8) | Host token or the host’s own env — still no service role in the browser |

A service-role key bypasses RLS. It must never appear in
`NEXT_PUBLIC_*`, client code, or Playwright.

---

## Supabase specifically

| Key | Role | This lab |
|---|---|---|
| Project URL | Where the API lives | Required for server client + e2e |
| Publishable / anon | Client; RLS applies | Required; `NEXT_PUBLIC_*` |
| Service role | Full access; bypasses RLS | **Do not add** |

`lib/supabase/server.ts` throws if the public pair is missing. That
error on CI means “env not wired,” not “Supabase is down.”

---

## Local / CI / Production (map)

```text
Local       .env (gitignored)                 names from .env.example
CI          GitHub Actions secrets            same names, no file
Production  host env (Vercel, etc.)           same names; Item 8
```

Same **names** everywhere. Different **stores**. Never the same
privileged key in the browser.

---

## What this item does **not** do

- Playwright job itself (Item 5)
- Husky / branch protection (Item 7)
- Vercel project wiring (Item 8)
- Adding a service-role key “for completeness”
- Committing `.env`
- A new CI job or gate

---

## In this project

| Piece | Value |
|---|---|
| Names file | `.env.example` (committed, fake values) |
| Values file | `.env` (gitignored) |
| Workflow | `.github/workflows/ci.yml` — `${{ secrets.* }}` only |
| Store | **Repository secrets** (both names). Not `vars`, not a GitHub Environment |
| Jobs that get env | **`e2e` only** |
| Jobs that do not | `quality`, `tests`, `build` |
| Required names | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Not in the app | service-role key; starter `ENABLE_DEMO_LOGIN` / `DEMO_*` (removed from `.env.example`) |
| Host / production | Item 8 |

```text
Local     .env                          NEXT_PUBLIC_SUPABASE_URL
                                        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

CI e2e    secrets.NEXT_PUBLIC_SUPABASE_URL
          secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

quality / tests / build    (none)

Production    host env, Item 8          same two names
```

Playwright also reads `PLAYWRIGHT_BASE_URL` (optional local override;
CI uses the config default `http://localhost:3000`). `CI` and
`NODE_ENV` are set by Actions / Next. `VERCEL_URL` is host-provided
in `app/layout.tsx` — not an Actions secret.

### How to tell “missing env” from “test failed”

On a red **`e2e`** job, open the log:

| Log | Meaning |
|---|---|
| `[WebServer] Missing Supabase env vars: set NEXT_PUBLIC_…` | Runner never received the pair. Check repository **secrets** names match YAML. |
| Playwright assertion / timeout, then artifact | Env was present. The journey failed. Download `playwright-report`. |

GitHub masks secret **values** in logs. You should see the name in
YAML, not the key itself.

### How to run locally

```bash
# copy names, fill real values — never commit this file
cp .env.example .env

npm run test:e2e
```

CI does not use that file. The `e2e` job gets the same names from
Actions.

---

## Self-check

**Does CI copy `.env` from the repo?**  
No. `.env` is gitignored. The runner is empty until YAML sets `env:`
from secrets.

**Why is the publishable key a secret if the browser can see it?**  
“Public” means the client bundle may include it. It is still
project-specific. Do not commit the production project’s value.
RLS — not git — is the door for the anon role.

**Why not put secrets on every job?**  
`quality` and `tests` mock or never call Supabase. Extra env is extra
leak surface. `build` compiles the Suspense shell without these names
today.

---

## Key insight

CI/CD pipelines have access to production infrastructure.

Treat pipeline credentials as part of application security, not merely
configuration.
