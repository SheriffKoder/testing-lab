# Testing Philosophy

> Phase 1 · Item 1.

Before writing a single test, we need to agree on what a test is _for_. This
document is the "why" behind everything else in Phase 1. It stays framework-
agnostic — the ideas apply whether we run Jest or Vitest.

---

## Why React Testing Library exists

Earlier tools (e.g. Enzyme) let you reach _inside_ a component — read its state,
call its methods, inspect which child components it rendered. That felt powerful
but coupled tests to _how_ a component was built. Rename a state variable or
split a component in two and the tests broke, even though the app still worked
perfectly for users.

React Testing Library (RTL) was built around one guiding principle:

> "The more your tests resemble the way your software is used, the more
> confidence they can give you." — Kent C. Dodds

So RTL deliberately gives you **no** access to internal state or the component
tree. It queries the **rendered DOM** the same way a user (or a screen reader)
would: by visible text, by roles, by labels. If a user can find it, your test
can find it — and vice versa.

---

## Test behavior, not implementation

- **Behavior** = what the user can observe or do. _"When there are no invoices,
  I see the message 'No invoices yet'."_
- **Implementation** = how the code makes that happen. _"The component checks
  `invoices.length === 0` and returns a `<div>` with certain Tailwind classes."_

Test the first. Ignore the second. The behavior is a promise to the user; the
implementation is a private decision we should be free to change.

A quick litmus test: _if I refactor this component without changing what the
user sees, should this test still pass?_ If yes, you're testing behavior. If a
harmless refactor would break it, you're testing implementation.

---

## Why testing internal state is discouraged

Internal state (hook values, private variables, which sub-components exist) is an
implementation detail. It churns constantly during refactors. Tests bound to it:

1. **Break on refactors that didn't break anything** — false alarms.
2. **Erode trust** — a suite that "cries wolf" gets ignored or deleted.
3. **Don't describe value** — "state `isOpen` became `true`" tells a teammate
   nothing about what the user gets.

Assert on the rendered result instead: the menu is _visible_, not that
`isOpen === true`.

---

## Confidence vs coverage

- **Coverage** is a _measurement_: the percentage of lines/branches your tests
  execute.
- **Confidence** is the _goal_: your belief that the app works for real users.

They are correlated but not the same. You can hit 100% coverage on trivial
getters and still have zero confidence in the checkout flow. A handful of tests
on the behaviors that matter often buys more confidence than exhaustively
covering formatting helpers. Coverage is a flashlight for finding _untested_
areas — not a score to maximize.

---

## Unit vs Integration vs E2E

| Level | Scope | Example in this app | Speed | Count |
|---|---|---|---|---|
| **Unit** | One pure function or component in isolation | `formatCurrency()`, `<InvoicesTable>` with props | Fast (ms) | Many |
| **Integration** | Several units wired together | Create-invoice form + validation + submit handler | Medium | Some |
| **E2E** | The whole app in a real browser | Open `/invoices`, create one, see it appear (Playwright) | Slow (s) | Few |

Higher levels give more realism and confidence per test, but cost more to write,
run, and maintain, and fail in vaguer ways.

---

## The testing pyramid

```
        /\
       /E2E\        few   — slow, most realistic
      /------\
     /  Integ \     some  — medium speed, realistic wiring
    /----------\
   /    Unit    \   many  — fast, isolated, cheap
  /--------------/
```

Lots of cheap, fast unit tests at the base; fewer integration tests; a small
number of E2E tests guarding critical journeys. The anti-pattern (the
"ice-cream cone") is the pyramid flipped: mostly slow, brittle E2E tests and few
unit tests — slow suites that fail for unclear reasons.

---

## Tradeoffs

| You gain… | …by giving up |
|---|---|
| Speed & isolation (unit) | Realism — mocks may drift from reality |
| Realism & confidence (E2E) | Speed & stability — slower, flakier |
| Many tests | Maintenance cost — every test is code you own |
| Strict assertions | Flexibility — over-specific tests block refactors |

There is no "correct" point — pick per case based on _what behavior is valuable
enough to protect_.

---

## Common beginner mistakes

- **Testing implementation details** — internal state, private functions, exact
  class names, which components rendered.
- **Snapshot-everything** — giant snapshots that no one reads; they "pass" until
  they don't, then get blindly updated.
- **Querying by test id / CSS class first** — prefer role/label/text so the test
  reflects real usage (and doubles as an accessibility check).
- **Mocking your own business logic** — mock _external_ systems (the network, the
  DB), not the code you're trying to gain confidence in.
- **Arbitrary `setTimeout` for async** — use `findBy*` / `waitFor` that resolve
  when the condition is actually met.
- **Testing the platform/framework** — don't assert that `Intl.NumberFormat` or
  React itself works; test _your_ usage of them.
- **Chasing 100% coverage** — optimize for confidence, not the number.

---

## Applying it: the Invoice Table

Target component: `views/invoices/ui/invoices-table.tsx` — a pure, presentational
table. Per Item 1 we add **no tests yet**; we only decide _what would be worth
testing_ later (Item 4).

### Behaviors worth testing (user-observable, survive refactors)

- **Empty state:** given `invoices={[]}`, the user sees **"No invoices yet"**.
- **Populated state:** given N invoices, the user sees **N rows**.
- Each row shows the **customer name**.
- Each row shows the **amount as human currency** (e.g. `$1,200.00`, not `1200`).
- Each row shows the **status label** (e.g. "paid", "overdue").
- Each row shows the **due date** in a readable format.
- **Accessibility / structure:** a table exists with the column headers
  _Customer, Status, Amount, Due date_ (queryable by role, like a user with a
  screen reader).

Each of these is a promise to the user. A refactor (renaming a helper, swapping
Tailwind classes, extracting the row into its own component) should leave them
all green.

### Behaviors NOT worth testing (implementation detail / low value)

- Exact **Tailwind class strings**, the `STATUS_PILL` colour map, hover styles.
- The decorative **avatar initial** chip (`aria-hidden`; purely cosmetic).
- A **full DOM snapshot** of the rendered markup.
- The **exact** locale string produced by `Intl.NumberFormat` / `DateTimeFormat`
  — that's testing the platform. (Our _own_ `formatCurrency` wrapper does get a
  unit test in Item 3, where we own the rules.)
- Internal constants like `SKELETON_ROWS` or the column-header CSS.

### The question to keep asking

> **"What user behavior am I actually verifying?"**

If you can't name a user-facing behavior, the test probably isn't worth writing.

---

## Key insight

**Good tests survive refactors. Bad tests fail every refactor.**

When you read a real production codebase, don't ask "what lines does this test
cover?" — ask **"what user behavior are they protecting?"** That question is the
throughline for the rest of Phase 1.
