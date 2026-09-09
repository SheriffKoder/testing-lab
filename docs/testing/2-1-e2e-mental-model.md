# E2E Testing Mental Model

> Phase 2 · Item 1 · Concepts / explanation.
>
> Companion decision table: [`2-1-invoice-test-boundaries.md`](./2-1-invoice-test-boundaries.md).
>
> Builds on [`1-1-testing-philosophy.md`](./1-1-testing-philosophy.md) and
> [`1-8-testing-inventory.md`](./1-8-testing-inventory.md).

Phase 1 asked: *Does this component (or helper) behave correctly in isolation?*

Phase 2 asks:

> Can a real user successfully complete this workflow in a real browser?

This item does **not** install Playwright. It locks the mental model so later
items do not turn every button into a browser test.

---

## What E2E testing means

**End-to-end (E2E)** means exercising the application the way a user would:
open a URL, see real UI, click and type, wait for navigation and network, and
assert on what appears on screen.

In this lab, that is Playwright against the Next.js invoice app — not a mocked
`listInvoices` call and not a `jest.fn()` for `onSubmit`.

E2E answers: *Do the pieces still work when they are wired together for real?*

---

## Jest / RTL vs Playwright

| | **Jest + RTL (Phase 1)** | **Playwright (Phase 2)** |
|---|---|---|
| **Runs in** | Node + **jsdom** (fake DOM) | Real browser (Chromium / Firefox / WebKit) |
| **Renders** | One component / tree you mount | Full app via HTTP (`localhost`) |
| **Data / I/O** | Usually mocked (Supabase, actions, router) | Often real app + real or controlled data |
| **Speed** | Milliseconds → seconds for the suite | Seconds per test; minutes for suites |
| **Best for** | Pure logic, UI contracts, isolated interactions | Multi-step workflows across routes |
| **Fails when** | A unit’s behavior breaks | Wiring, routing, SSR, browser, or integration breaks |

RTL and Playwright share a **query philosophy** (`getByRole`, labels, text).
They differ in **environment** and **scope**.

---

## Component behavior vs user journeys

**Component behavior** (RTL):

- Does the form show a validation message when amount is empty?
- Does Cancel call the expected callback?
- Does the table render an empty state when given `[]`?

**User journey** (Playwright):

- Can a user open `/invoices`?
- Can they click through to create an invoice, submit, and land back on the list?
- Does the new invoice appear in the table after a real persist?

Same product area; different confidence questions.

---

## jsdom vs a real browser

**jsdom** approximates the DOM in Node. It is fast and enough for most React
unit/component tests. It is **not** a full browser:

- No real layout / paint / focus quirks of Chrome vs Safari
- No real navigation stack the way Next.js App Router uses it in production
- No real network stack unless you mock it
- Limited or different behavior for some APIs (cookies, streaming nuance, etc.)

**Playwright** drives Chromium / Firefox / WebKit. Layout, navigation, and
browser APIs behave like a user’s machine. That realism is why E2E is slower
and more valuable for journeys.

---

## What Playwright can test that RTL cannot (well)

Examples from this app:

| Concern | RTL today | Playwright |
|---|---|---|
| Route `/invoices` → `/invoices/new` → back | Mocked `useRouter` | Real navigation |
| Suspense / loading shell on the route | Skeleton unit test; not full streaming | Real load in browser |
| Server Component → Supabase → table | Mocked `listInvoices` | Real or intercepted list |
| Create → persist → refreshed list | Mocked action; list not re-fetched for real | Full create journey |
| CSS / layout that hides a control | Usually out of scope | Can catch “button exists but unusable” |

RTL **can** mount many components; it still cannot honestly prove the full
Next.js + browser path without becoming a fragile mini-E2E inside jsdom.

---

## Why E2E tests are slower and more expensive

Each E2E test typically:

1. Starts or reuses a web server
2. Launches a browser
3. Loads the app over the network
4. Waits for real async work (SSR, fetches, hydration)
5. Tears down or resets state

Cost shows up as:

- **Runtime** — CI minutes grow quickly
- **Flakiness risk** — timing, data, environment
- **Debugging cost** — failures span many layers
- **Maintenance** — UI copy and flows change

So: few high-value journeys, not a mirror of every unit test.

---

## Why we should not test everything through Playwright

If every validation message and formatter only lived behind Playwright:

- Feedback would be slow for day-to-day coding
- Failures would be vague (“create flow failed” vs “amount validation”)
- The suite would be expensive and brittle

**Rule of thumb:** choose the **smallest layer** that still gives meaningful
confidence. Playwright when the behavior depends on **multiple parts working
together** (routing + server + UI + data).

---

## Unit → integration → E2E confidence layers

```
        /\
       /E2E\        few   — journeys in a real browser (Playwright)
      /------\
     /  Integ \     some  — wired modules (optional; Phase 1 used unit+mocks)
    /----------\
   / Unit+RTL   \   many  — helpers, components, interactions (Jest)
  /--------------\
```

This lab has no dedicated integration-testing item. Phase 1 put a few
**narrow, mocked wiring** cases under `tests/unit/` (e.g. `CreateInvoiceView`,
`InvoicesSection`). Full mid-layer suites (real Next route + MSW, etc.) remain
optional. Phase 2 focuses on **E2E** with Playwright.

Phase 1 inventory ([`1-8-testing-inventory.md`](./1-8-testing-inventory.md))
already ranked what deserves unit protection. Phase 2 Item 1 ranks the **same
product** for **browser** protection without duplicating every unit case —
see [`2-1-invoice-test-boundaries.md`](./2-1-invoice-test-boundaries.md).

---

## When a feature should have both RTL and Playwright

**Both** when:

1. **RTL** protects detailed UI contracts cheaply (validation copy, empty table,
   keyboard on one form).
2. **Playwright** protects the **journey** those pieces participate in
   (navigate → create → see row).

Example — Create Invoice:

| Layer | Confidence |
|---|---|
| RTL (`CreateInvoiceForm`) | Fields, validation, payload shape, cancel |
| RTL (`CreateInvoiceView` + mocks) | Wiring to action + navigate / alert |
| Playwright (later items) | User can complete create and see the list update |

Do **not** re-assert every validation string in Playwright if RTL already owns it.

---

## Common mistakes when moving from component tests to E2E

1. **Re-writing every RTL case as E2E** — slow pyramid upside-down.
2. **CSS / nth-child selectors** — brittle; prefer roles and labels (Item 3).
3. **Assuming mocks still apply** — Playwright hits the real app unless you
   intercept network (later items).
4. **Ignoring test data** — shared DB state makes tests order-dependent.
5. **Testing implementation** — assert user-visible outcomes, not internal
   React state.
6. **Inventing features for demos** — use the existing invoice app; do not build
   edit/delete only to practice Playwright.

---

## Invoice examples (current app)

What exists today: **list invoices**, **create invoice**, route loading / error
UI. Edit / delete are **not** product surfaces yet — treat those as *future*
illustrations only.

### RTL-shaped questions (already largely covered in Phase 1)

- Does the invoice form show a validation message?
- Does clicking Cancel call the expected behavior?
- Does the table render an empty state?

### Playwright-shaped questions (Phase 2+)

- Can a user open the invoices page?
- Can they create an invoice end-to-end?
- Does the new invoice appear in the table afterward?

---

## Self-check

**Why shouldn't I test every button using Playwright?**  
Because E2E is slow, expensive, and vague when it fails. Button-level contracts
belong in Jest/RTL; Playwright should protect journeys that need many parts
working together.

**What confidence does Playwright give me that RTL cannot?**  
That the real browser + Next.js routes + server/data path still works for a user
— navigation, load, persist, and refreshed UI — not just an isolated component
with mocks.

---

## Key insight

Choose the smallest testing layer that gives meaningful confidence.

Use Playwright when the behavior depends on multiple parts of the application
working together.
