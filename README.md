
# testing-lab

**Description:**
Reference lab for introducing **testing, CI/CD, and performance** into an existing Next.js codebase. Practices ship phase by phase under `docs/`; the practice ground is a small invoice app on Supabase. The product is intentionally simple — the goal is learning why a team adds each practice, how it is wired, and how you verify it works.

**Applications:**  
MindFree: Authenticated user note edit ([tests](https://github.com/SheriffKoder/MindFree-notes-tasks-tracker/tree/main/docs/testing) / [CI](https://github.com/SheriffKoder/MindFree-notes-tasks-tracker/tree/main/docs/ci))



## Layout

| Area | Role |
|------|------|
| `docs/testing/` | Phase 1–3 concepts and strategy |
| `docs/performance/` | Phase 4 Core Web Vitals and LHCI |
| `entities/` · `features/` · `views/` · `shared/` | FSD app layers (invoice domain) |
| `tests/` | Jest/RTL unit + integration, Playwright e2e |
| `app/` | Route entrypoints (`/invoices`, lab chrome) |
| `.github/workflows/` | CI (quality, tests, build, e2e, lighthouse) |

## Run

```bash
npm install
cp .env.example .env   # fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Open [http://localhost:3000/invoices](http://localhost:3000/invoices).

Useful gates:

```bash
npm test                 # Jest + RTL
npm run test:e2e         # Playwright
npm run verify           # lint → typecheck → Jest → e2e → build
npm run build && npm run lhci   # local Lighthouse CI (needs Chrome + env)
```

---

## Lab phases

### Phase 0 — App foundation

| | |
|---|---|
| **Status** | Done |
| **Description** | Next.js + TypeScript + Tailwind + Supabase starter with `tl_invoices` and a list page so later phases have real code to protect. |
| **Outcome** | `/invoices` — invoice table backed by Supabase. |

Tracked plans live under [`app/development/testing/`](./app/development/testing/). Product brief: [`PRODUCT-REFERENCE.md`](./app/development/testing/PRODUCT-REFERENCE.md).

---

### Phase 1 — Jest + React Testing Library

| | |
|---|---|
| **Status** | Done |
| **Description** | Incremental unit and component testing: behavior over implementation, confidence over coverage %, pyramid tradeoffs. |
| **Outcome** | Jest + RTL suite around invoice helpers, table, form interactions, async list states, and mocked create-invoice. |

**How it lands in the repo:** tests live under `tests/unit` and `tests/integration`; coverage is scoped to FSD layers (not thin `app/` shells or shadcn chrome). Coverage % is a spotlight, not a merge gate.

| Item | Doc |
|------|-----|
| 1 Testing philosophy | [`1-1-testing-philosophy.md`](./docs/testing/1-1-testing-philosophy.md) |
| 2 Jest environment | [`1-2-jest-environment.md`](./docs/testing/1-2-jest-environment.md) |
| 3 Unit tests | [`1-3-unit-tests.md`](./docs/testing/1-3-unit-tests.md) |
| 4 Component tests | [`1-4-component-tests.md`](./docs/testing/1-4-component-tests.md) |
| 5 User interactions | [`1-5-user-interactions.md`](./docs/testing/1-5-user-interactions.md) |
| 6 Async testing | [`1-6-async-testing.md`](./docs/testing/1-6-async-testing.md) |
| 7 Mocking | [`1-7-mocking.md`](./docs/testing/1-7-mocking.md) |
| 8 Coverage strategy | [`1-8-testing-strategy.md`](./docs/testing/1-8-testing-strategy.md) · [`1-8-testing-inventory.md`](./docs/testing/1-8-testing-inventory.md) |

---

### Phase 2 — Playwright

| | |
|---|---|
| **Status** | Done |
| **Description** | Protect real user journeys in a browser: locators, waiting, isolation, network control, and when E2E beats Jest/RTL. |
| **Outcome** | Playwright e2e under `tests/e2e` against the Next.js app (`playwright.config.ts` + `webServer`). |

**How it lands in the repo:** E2E answers “can a user finish this workflow?” — not every button. Layer choice per invoice behavior is in the Phase 2 strategy doc.

| Item | Doc |
|------|-----|
| 1 E2E mental model | [`2-1-e2e-mental-model.md`](./docs/testing/2-1-e2e-mental-model.md) · [`2-1-invoice-test-boundaries.md`](./docs/testing/2-1-invoice-test-boundaries.md) |
| 2 Playwright setup | [`2-2-playwright-setup.md`](./docs/testing/2-2-playwright-setup.md) |
| 3 Locators | [`2-3-playwright-locators.md`](./docs/testing/2-3-playwright-locators.md) |
| 4 User journeys | [`2-4-e2e-user-journeys.md`](./docs/testing/2-4-e2e-user-journeys.md) |
| 5 Waiting | [`2-5-playwright-waiting.md`](./docs/testing/2-5-playwright-waiting.md) |
| 6 Isolation | [`2-6-playwright-test-isolation.md`](./docs/testing/2-6-playwright-test-isolation.md) |
| 7 Network testing | [`2-7-playwright-network-testing.md`](./docs/testing/2-7-playwright-network-testing.md) |
| 8 Debugging & strategy | [`2-8-playwright-debugging-and-strategy.md`](./docs/testing/2-8-playwright-debugging-and-strategy.md) |

---

### Phase 3 — CI/CD

| | |
|---|---|
| **Status** | Done |
| **Description** | Automate verification on every PR: GitHub Actions jobs, Playwright in CI, secrets, Husky, branch protection. Actions proves; Vercel (planned) ships — no deploy job in YAML. |
| **Outcome** | `.github/workflows/ci.yml` — `quality`, `tests`, `build`, `e2e` (plus Phase 4 `lighthouse`). Local mirror: `npm run verify`. |

**How it lands in the repo:** merge to `main` requires green checks. Playwright still hits localhost + Supabase secrets, not a preview URL. Host deploy stays out of Actions by design.

| Item | Doc |
|------|-----|
| 1 CI/CD mental model | [`3-1-ci-cd-mental-model.md`](./docs/testing/3-1-ci-cd-mental-model.md) · [`3-1-ci-checks-map.md`](./docs/testing/3-1-ci-checks-map.md) |
| 2 Actions basics | [`3-2-github-actions-basics.md`](./docs/testing/3-2-github-actions-basics.md) |
| 3 Tests in CI | [`3-3-tests-in-ci.md`](./docs/testing/3-3-tests-in-ci.md) |
| 4 Jobs & cache | [`3-4-github-actions-jobs-and-cache.md`](./docs/testing/3-4-github-actions-jobs-and-cache.md) |
| 5 Playwright in CI | [`3-5-playwright-in-ci.md`](./docs/testing/3-5-playwright-in-ci.md) |
| 6 Secrets & environments | [`3-6-ci-secrets-and-environments.md`](./docs/testing/3-6-ci-secrets-and-environments.md) |
| 7 Git guardrails | [`3-7-git-guardrails.md`](./docs/testing/3-7-git-guardrails.md) |
| 8 CI/CD strategy | [`3-8-ci-cd-strategy.md`](./docs/testing/3-8-ci-cd-strategy.md) |

---

### Phase 4 — Core Web Vitals & performance

| | |
|---|---|
| **Status** | Done |
| **Description** | Measure, diagnose, and protect frontend performance on `/invoices`: lab tools, LCP work, Next.js architecture, RUM concepts, Lighthouse CI budgets. |
| **Outcome** | LHCI on production `next start` + `/invoices` budgets in CI; optional `WebVitalsReporter` for field-shaped signals. |

**How it lands in the repo:** soft score/LCP warns, hard CLS and script-size errors — not score 100 on every PR. Lab CI does not replace production RUM.

| Item | Doc |
|------|-----|
| 1 Core Web Vitals | [`4-1-core-web-vitals-mental-model.md`](./docs/performance/4-1-core-web-vitals-mental-model.md) · [`4-1-invoices-performance-hypothesis.md`](./docs/performance/4-1-invoices-performance-hypothesis.md) |
| 2 Measurement tools | [`4-2-performance-measurement-tools.md`](./docs/performance/4-2-performance-measurement-tools.md) · [`4-2-performance-baseline.md`](./docs/performance/4-2-performance-baseline.md) |
| 3 LCP | [`4-3-lcp-optimization.md`](./docs/performance/4-3-lcp-optimization.md) · [`4-3-lcp-experiment.md`](./docs/performance/4-3-lcp-experiment.md) |
| 4 CLS | Concepts-only (lab CLS was already 0) |
| 5 INP | [`4-5-inp-and-interactivity.md`](./docs/performance/4-5-inp-and-interactivity.md) |
| 6 Next.js performance | [`4-6-nextjs-performance.md`](./docs/performance/4-6-nextjs-performance.md) · [`4-6-nextjs-performance-audit.md`](./docs/performance/4-6-nextjs-performance-audit.md) |
| 7 RUM | [`4-7-real-user-monitoring.md`](./docs/performance/4-7-real-user-monitoring.md) · [`4-7-performance-monitoring-strategy.md`](./docs/performance/4-7-performance-monitoring-strategy.md) |
| 8 LHCI & budgets | [`4-8-performance-ci.md`](./docs/performance/4-8-performance-ci.md) · [`4-8-performance-strategy.md`](./docs/performance/4-8-performance-strategy.md) |

---

## Key insight

```text
Phase 1  Does this unit behave correctly?
Phase 2  Can a user finish the journey?
Phase 3  Is every change verified before merge?
Phase 4  Is the experience still fast and stable?
```

Start each new feature by asking what behavior is valuable enough to protect — then pick the cheapest layer that protects it.
