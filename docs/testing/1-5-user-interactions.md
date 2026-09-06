# User Interaction Testing

> Phase 1 · Item 5.

Item 4 rendered a component and asserted on **static output** ("given these props,
does the user see the right thing?"). Item 5 adds the missing half: **behavior**.
We simulate a real user — typing into fields, clicking buttons, submitting a form —
and assert on what happens as a result.

Target component (built in this item): **`CreateInvoiceForm`** — a controlled form
with callback props. Tests never call `onSubmit()` themselves; they click the
button (or press Enter) and let the component call it.

---

## `fireEvent`

The low-level API from `@testing-library/react`. It dispatches **one raw DOM event**:

```tsx
import { fireEvent } from "@testing-library/react";

fireEvent.change(input, { target: { value: "Acme" } });
fireEvent.click(button);
```

`fireEvent.change` sets the value and fires a single `change` event — that's it. It does
**not** reproduce the sequence a real browser produces (focus, keydown, keypress,
input, keyup, …). It's fast and occasionally necessary, but it's a blunt instrument.

---

## `userEvent`

The high-level, user-centric API from `@testing-library/user-event`. Each call
**simulates the full event sequence** a real browser fires:

```tsx
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();        // call once per test, before rendering
await user.type(input, "Acme");        // fires keydown/keypress/input/keyup per char
await user.click(button);              // fires pointer + mouse + focus events
await user.clear(input);               // selects all + deletes
await user.selectOptions(select, "paid");
await user.keyboard("{Enter}");        // key-level control (Tab, Enter, Escape…)
await user.tab();                      // move focus like pressing Tab
```

Notes:

- `userEvent.setup()` returns a `user` instance; call it **before** `render()`.
- Every interaction is **async** — always `await` it.
- `type()` appends character-by-character, so controlled inputs update per keystroke
  exactly like production.

---

## Why `userEvent` is usually preferred

| Aspect | `fireEvent` | `userEvent` |
|---|---|---|
| Event fidelity | one synthetic event | full realistic sequence |
| Focus / blur | not handled | handled automatically |
| Typing | sets value once | key-by-key, respects `maxLength`, `disabled` |
| Catches bugs | misses focus/keyboard bugs | catches them |
| Realism | low | high — resembles a real user |
| Speed | marginally faster | slightly slower (negligible) |

**Rule of thumb:** reach for `userEvent` by default. Drop to `fireEvent` only for events
`userEvent` doesn't model, or to reproduce an exact low-level edge case.

---

## Typing

```tsx
const customer = screen.getByLabelText("Customer");
await user.type(customer, "Acme Corp");
expect(customer).toHaveValue("Acme Corp");
```

- Query fields by their **label** (`getByLabelText`) — how a user and screen reader
  identify them; forces accessible markup (`<label htmlFor>`).
- Assert value with `toHaveValue` (jest-dom).
- To replace existing text: `await user.clear(field)` then `await user.type(...)`.

---

## Clicks

```tsx
await user.click(screen.getByRole("button", { name: "Create invoice" }));
await user.click(screen.getByRole("button", { name: "Cancel" }));
```

Query buttons by **role + accessible name**, not test ids. Clicking the real button
triggers form submission / cancel through the DOM.

---

## Forms

A `<form>` submits when its submit button is clicked (or `Enter` is pressed in a field).
We test the whole loop:

1. **Fill** every field with `user.type` / `user.selectOptions`.
2. **Submit** by clicking the submit button (or pressing Enter).
3. **Assert** the submit handler was called with the parsed values.

Callback props (`onSubmit`, `onCancel`) receive **`jest.fn()`** mocks:

```tsx
const onSubmit = jest.fn();
render(<CreateInvoiceForm onSubmit={onSubmit} onCancel={jest.fn()} />);
// …fill + submit…
expect(onSubmit).toHaveBeenCalledTimes(1);
expect(onSubmit).toHaveBeenCalledWith({
  customer: "Acme Corp",
  amount: 1200, // number — proves the form parsed the string input
  status: "pending",
  dueDate: "2026-08-15",
});
```

The form stays **isolated** — no Supabase, no network. Real mutation wiring is **Item 7**.

### Validation

Invalid submit must **not** call `onSubmit`, and must **show an error the user can read**:

```tsx
await user.click(screen.getByRole("button", { name: "Create invoice" }));

expect(screen.getByText("Customer is required")).toBeInTheDocument();
expect(onSubmit).not.toHaveBeenCalled();
```

Assert **visible error text** (`role="alert"`), never an internal `errors` object.

---

## Keyboard interaction

```tsx
await user.tab();
expect(screen.getByLabelText("Customer")).toHaveFocus();

await user.keyboard("{Enter}"); // submit from within a field
```

`toHaveFocus()` verifies focus moved correctly — important for accessibility.

---

## Tradeoffs

| Choice | Pros | Cons |
|---|---|---|
| **`userEvent`** (default) | realistic, catches focus/keyboard bugs, async-safe | slightly slower; must `await` |
| **`fireEvent`** | fast, one event | misses real sequences; can pass while real UX is broken |
| **Callback props + `jest.fn()`** | isolated, no network, fast, asserts exact payload | doesn't prove real DB wiring (Item 7) |
| **Asserting visible errors** | behavior-focused, survives refactors | must render real error UI |
| **Asserting internal state** | quick | brittle — avoid |

Item 5 chooses **`userEvent` + callback props + visible-error assertions**.

---

## Common beginner mistakes

- Forgetting `await` on `userEvent` calls → flaky tests.
- Calling `userEvent.setup()` after `render()` → set up the `user` first.
- Invoking handlers directly (`onSubmit()`) instead of clicking.
- Using `fireEvent.change` for everything — misses focus/keyboard paths.
- Querying fields by `data-testid` instead of `getByLabelText`.
- Asserting on `errors` state instead of rendered error text.

---

## In this project

### Files

| Role | Path |
|---|---|
| Input type | `features/create-invoice/model/new-invoice-input.ts` |
| Form component | `features/create-invoice/ui/create-invoice-form.tsx` |
| Feature barrel | `features/create-invoice/index.ts` |
| Valid submit fixture | `tests/fixtures/invoices.ts` (`validInvoiceInput`) |
| Interaction tests | `tests/unit/features/create-invoice/ui/create-invoice-form.test.tsx` |
| Page (optional wiring) | `/invoices/new` via `app/invoices/new/page.tsx` + `views/invoices/ui/create-invoice-view.tsx` |
| List CTA | `views/invoices/ui/invoices-page-header.tsx` → "Create invoice" |

Server-only invoice reads stay on `@/entities/invoice/server` / `@/views/invoices/server`
so the client form never pulls `next/headers` into the client bundle.

### Interaction choices per block

| Block | What we assert | How |
|---|---|---|
| **A — Typing** | Customer / Amount / Status reflect input | `user.type`, `user.selectOptions`, `toHaveValue` |
| **B — Valid submit** | `onSubmit` once with parsed payload (`amount` as **number**) | fill fixture → `user.click` Create invoice → `toHaveBeenCalledWith` |
| **C — Validation** | Visible errors; handler idle | empty submit → "Customer is required"; amount `0` → "Amount must be greater than 0" |
| **D — Cancel** | `onCancel` once; `onSubmit` idle | `user.click` Cancel |
| **E — Keyboard** | Tab focuses Customer; Enter submits valid form | `user.tab` / `toHaveFocus`; `user.keyboard("{Enter}")` |

No `toMatchSnapshot()`. No `fireEvent` in the suite.

### Test comment convention

The interaction test file:

- opens with a `@file` header listing `userEvent` + Jest primitives,
- comments the first use of `userEvent.setup`, `user.type` / `click` / `selectOptions` /
  `tab` / `keyboard`, `jest.fn`, `getByLabelText`, `getByRole`, and mock/focus matchers,
- notes that we prefer `userEvent` over `fireEvent`,
- does **not** call handlers directly.

### Out of scope

- Async loading / `waitFor` / `findBy` after submit → Item 6
- Mocking the real Supabase create mutation → Item 7
- Full list↔form integration / E2E → later

### Verification

```bash
npm test
# 5 suites, 31 tests (Items 2–5)

npm test -- tests/unit/features/create-invoice/ui/create-invoice-form.test.tsx
# 9 interaction tests

npm run test:coverage -- --collectCoverageFrom='features/create-invoice/**/*.{ts,tsx}'
# create-invoice-form.tsx at 100% statements in this run
```

---

## Key insight

**Prefer interactions that resemble real users. Avoid directly invoking handlers.**

If a test clicks the button and the form calls `onSubmit`, it protects the user's
actual flow. If it calls `onSubmit()` directly, it protects nothing a user cares about.

After Item 5 you should answer: _"Does my test click the button, or does it call
`onSubmit` directly?"_ → It must **click**. _"If validation breaks and an invalid
invoice submits, does a test fail?"_ → Yes — that's protecting real user behavior.
