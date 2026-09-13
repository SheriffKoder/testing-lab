# Testing Strategy (Coverage)

> Phase 1 · Item 8 · Concepts / explanation.
>
> Companion decision table: [`1-8-testing-inventory.md`](./1-8-testing-inventory.md).
>
> After Phase 2, which **layer** (Jest / RTL / Playwright) for each invoice
> behavior: [`2-8-playwright-debugging-and-strategy.md`](./2-8-playwright-debugging-and-strategy.md).
>
> After Phase 3 Item 1, **when** those commands run (local / PR / main / deploy):
> [`3-1-ci-cd-mental-model.md`](./3-1-ci-cd-mental-model.md) and
> [`3-1-ci-checks-map.md`](./3-1-ci-checks-map.md).

Items 2–7 built a real Jest + RTL suite around invoices: pure helpers, table
rendering, form interactions, async list states, and offline Create Invoice with
mocks. Item 8 steps back and asks a different question:

> Not “how do I write another test?” but “what is worth protecting next?”

The phase goal:

> Treat coverage as a measurement. Use confidence as the goal. Leave a checklist
> so every future feature starts with an intentional testing decision.

---

## Code coverage

**Code coverage** is a report of which lines / branches / functions / statements
your tests executed.

Typical Jest report (via `npm run test:coverage`):

| Metric | Meaning |
|---|---|
| **Statements** | How many executable statements ran |
| **Branches** | How many `if` / ternary / switch paths ran |
| **Functions** | How many functions were called |
| **Lines** | How many source lines ran |

Coverage answers: *“Did a test touch this code?”*  
It does **not** answer: *“Would a broken user behavior fail a test?”*

A line can be “covered” by a test that never asserts anything useful about it.
100% coverage with weak assertions is still low confidence.

---

## Meaningful coverage

**Meaningful coverage** means the executed code is exercised *through a behavior
you care about*, with an assertion that would fail if that behavior broke.

Signs coverage is meaningful:

- the test names a user-visible or contract-level outcome;
- removing the assertion (or breaking the behavior) turns the test red;
- the path is one users or callers actually take.

Signs coverage is theater:

- snapshots of entire trees “just to hit lines”;
- tests that only mount a component and assert it rendered without checking
  outcomes;
- mocking your own business logic so the test only proves the mock works;
- chasing percentage targets while critical flows stay unasserted.

Item 1 framed this as **confidence vs coverage**. Item 8 operationalizes it:
read the report, then decide per area — do not treat the percentage as a grade.

---

## Confidence

**Confidence** is the belief that if an important behavior regresses, a test fails
before users notice.

High confidence usually comes from:

- protecting core user journeys (list invoices, create invoice, empty/error);
- protecting pure domain rules (formatters, row mapping);
- testing at the right boundary (UI behavior, entity mutation with mocked DB);

Low confidence despite high % often means:

- lots of shallow UI chrome tests;
- unused helpers “covered” by accident;
- critical error paths never arranged.

Ask: *“If I deleted this test file, what user-facing risk would I accept?”*
If the answer is “nothing,” the test was not buying confidence.

---

## Diminishing returns

Early tests on core behaviors buy a lot of confidence per hour.

Later tests often cost more and buy less:

```text
confidence
    ^
    |        ●●●●
    |     ●●
    |   ●
    | ●
    |●________________> effort / % coverage
         core     polish / chrome
```

Examples of diminishing returns in this app:

- asserting every Tailwind class on the invoices shell;
- re-testing `formatCurrency` through the table *and* in isolation *and* again
  through the form (pick the right layer once);
- snapshotting shadcn primitives under `components/ui/`;
- forcing 100% on thin `app/` route shells that only compose views.

Stop when the next test would mostly lock implementation or duplicate an
existing contract.

---

## What should be tested

Prefer testing when the behavior is:

| Criterion | Example in this project |
|---|---|
| User-visible and valuable | Table rows, empty state, form validation, create success/error |
| Easy to get wrong | Amount parsing, snake_case insert mapping, status fallbacks |
| Stable contract | `toInvoice`, `createInvoice` error messages, accessible roles |
| Cross-cutting risk | Client importing `next/headers` via a barrel (caught by architecture + tests at boundaries) |
| Async / failure path | List reject → error UI; create reject → alert, no navigate |

These are the “Should be tested” bucket in the inventory.

---

## What should not (usually)

Prefer **not** adding dedicated tests when the code is:

| Criterion | Example |
|---|---|
| Pure composition / thin shell | `app/invoices/page.tsx` re-exporting a view |
| Generated or third-party UI | Most of `components/ui/*` (shadcn) |
| Trivial types / constants | `NewInvoiceInput` type-only file; barrel `index.ts` |
| Already covered at a better boundary | Re-testing table formatting if helpers + table contracts exist |
| Visual chrome only | Decorative gradients, layout spacing |
| Requires full Next runtime | Full RSC streaming / middleware — later integration/E2E |

These land in “Doesn't need testing” (or “Nice to test” if cheap and clarifying).

“Doesn't need testing” does **not** mean “never fails.” It means *dedicated unit
tests are the wrong investment*; rely on composition, types, or a future E2E.

---

## Checklist for future features

Before writing the first test for a new feature, answer:

1. **What user behavior am I protecting?** (one sentence)
2. **What would a regression look like to a user?**
3. **Unit, interaction, or async/integration?** (pyramid fit)
4. **What is the external boundary?** (DB, network, clock — mock that, not domain)
5. **What must stay real?** (pure helpers, visible validation, mapping)
6. **Should / Nice / Skip** for each new surface (UI, mutation, action, route shell)
7. **How will I know I’m done?** (contracts green — not “coverage went up 2%”)

Paste a short version of this into the feature’s README or PR when useful.

---

## Common beginner mistakes

- Treating 80% / 100% as a ship gate without reading uncovered paths.
- Writing tests only to silence coverage on barrels and type files.
- Equating “line executed” with “behavior protected.”
- Skipping failure paths because happy-path % already looks good.
- Adding E2E for every unit gap (or unit tests for every E2E gap) instead of
  choosing the cheapest layer that protects the behavior.
- Expanding `collectCoverageFrom` to include everything, then panicking at noise
  from `components/ui` and `app/` shells.

---

## In this project

### Two docs for Item 8

| Doc | Role |
|---|---|
| [`1-8-testing-strategy.md`](./1-8-testing-strategy.md) (this file) | Concepts: coverage, confidence, diminishing returns, checklist |
| [`1-8-testing-inventory.md`](./1-8-testing-inventory.md) | Decisions: area map, Should / Nice / Doesn't need, uncovered review, holes |

### What `collectCoverageFrom` measures

Configured in `jest.config.ts` for FSD layers only:

```ts
collectCoverageFrom: [
  "entities/**/*.{ts,tsx}",
  "features/**/*.{ts,tsx}",
  "views/**/*.{ts,tsx}",
  "widgets/**/*.{ts,tsx}",
  "shared/**/*.{ts,tsx}",
  "!**/index.ts",
  "!**/*.d.ts",
],
```

**Included:** invoice entity, create-invoice feature, views, shared helpers.  
**Excluded by design:** barrel `index.ts`, type decl files, thin `app/` route shells,
most `components/ui/*` noise.

Do not expand the glob just to inflate the global percentage.

### How to run coverage

```bash
npm run test:coverage
```

Optional focused slices (supporting evidence only):

```bash
npm run test:coverage -- \
  --collectCoverageFrom='entities/invoice/**/*.{ts,tsx}' \
  --collectCoverageFrom='features/create-invoice/**/*.{ts,tsx}' \
  --collectCoverageFrom='views/invoices/**/*.{ts,tsx}' \
  --collectCoverageFrom='shared/lib/**/*.{ts,tsx}'
```

Baseline when Item 8 was drafted: **10 suites / 41 tests**, roughly **~74%
statements** on in-scope FSD files. No mandatory new tests were added — soft
branch gaps are documented in the inventory.

### How to use the report

1. Run coverage (spotlight).
2. Open the [inventory](./1-8-testing-inventory.md) — map areas, bucket them,
   review uncovered files.
3. Add a test only for a **real confidence hole**; otherwise document the skip.

### Conceptual checks

- Does coverage answer “behavior protected”? **No** — only “code executed.”
- Are 0% mocked modules (`listInvoices`, `createInvoiceAction`) always holes?
  **No** — often intentional mock boundaries.
- Ship gate = percentage? **No** — inventory decisions + green contracts.

---

## Key insight

**Coverage is a measurement. Confidence is the goal.**

Every future feature should begin by asking:

> What behavior is valuable enough to protect?
