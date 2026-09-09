# Mocking

> Phase 1 · Item 7.

Item 5 tested `CreateInvoiceForm` with **callback props** (`jest.fn()` for `onSubmit`).
Item 6 mocked **`listInvoices`** so list UI never hit Supabase. Item 7 goes one step
further: **persist a new invoice** through a real write use-case, while **mocking the
external system** so tests run offline and leave the database unchanged.

The phase goal:

> Mock Supabase calls. Test Create Invoice without contacting the real database.

---

## What “mocking” means

A **mock** is a stand-in for a dependency you do not want to run for real in the test.

You replace it so you can:

1. **Isolate** the unit under test from networks, disks, clocks, or third-party SDKs.
2. **Control** outcomes (success payload, empty result, thrown error).
3. **Observe** how your code called the dependency (args, call count).

Mocks are tools for **boundaries**. The more you mock *inside* your own domain logic,
the less confidence you have that the real path works.

---

## Mock functions (`jest.fn`)

The smallest mock is a function that records calls:

```tsx
const onSubmit = jest.fn();

onSubmit({ customer: "Acme Corp", amount: 1200 });

expect(onSubmit).toHaveBeenCalledTimes(1);
expect(onSubmit).toHaveBeenCalledWith(
  expect.objectContaining({ customer: "Acme Corp" }),
);
```

Useful for:

- callback props (Item 5);
- event handlers (`reset` in Item 6’s error UI);
- asserting “this collaborator was invoked with X.”

`mockResolvedValue` / `mockRejectedValue` turn a `jest.fn()` into an async collaborator
without writing `async () => value` every time.

---

## Module mocking (`jest.mock`)

`jest.mock(modulePath, factory)` replaces an entire module **before** imports run
(Jest hoists the call). Production code still writes normal imports; the test supplies
the fake implementation.

Item 6 pattern (keep using it):

```tsx
jest.mock("@/entities/invoice/queries/list-invoices", () => ({
  listInvoices: jest.fn(),
}));

const mockedListInvoices = jest.mocked(listInvoices);
mockedListInvoices.mockResolvedValue(mockInvoices);
```

Item 7 extends the same idea to:

1. **`createInvoiceAction`** (feature server action) — mock the write boundary when
   testing view wiring;
2. **`@/lib/supabase/server`** — mock `createClient` when testing the mutation itself, so
   the test proves insert mapping without a real DB.

Rules of thumb:

- Mock the **deepest module that is still a clear boundary** (query/mutation file or
  Supabase client factory), not random UI children.
- Prefer mocking **your entity’s public server API’s underlying module** (or the thin
  server action that calls it), not every formatter and table component. That is a
  **mock cut point**, not a claim that entity APIs are the only things worth testing.
- Remember: SWC rewrites `@/` in imports, but `jest.mock("@/...")` needs
  `moduleNameMapper` (added in Item 6).

---

## Fetch mocking

When code uses the browser / Node `fetch` API:

```tsx
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ id: "inv-001" }),
} as Response);
```

Or per-test:

```tsx
jest.spyOn(global, "fetch").mockResolvedValueOnce(/* ... */);
```

Use fetch mocks when **your code calls `fetch`**. This project’s invoice persistence goes
through the **Supabase JS client**, not raw `fetch` in feature code — so Item 7 mocks
Supabase (or the server action), and treats raw `fetch` mocking as a concept for APIs
you own.

Pitfalls:

- forgetting to restore / clear between tests;
- asserting on URL strings that change with env;
- mocking `fetch` when the real call is buried inside an SDK you should mock at a higher
  boundary instead.

---

## API mocking (HTTP contract level)

**API mocking** usually means intercepting HTTP at the network edge — for example
[MSW (Mock Service Worker)](https://mswjs.io/):

```tsx
// Conceptual — not installed in this item
http.post("/rest/v1/tl_invoices", () => HttpResponse.json({ id: "inv-001" }))
```

| Approach | Isolation | Realism |
|---|---|---|
| Mock `createInvoice` / server action | high | low (never exercises client/SDK) |
| Mock `createClient` / Supabase chain | medium | medium (exercises mutation mapping) |
| MSW / HTTP intercept | lower isolation | higher (real client, fake HTTP) |
| Real Supabase | none | highest (slow, needs credentials) |

Item 7 **does not install MSW**. The suite uses Jest module mocks so Create Invoice
tests stay offline and fast. MSW remains an option for a later integration suite.

---

## Store mocking

“Store” means shared client state: Redux, Zustand, Jotai, or a server-state cache such as
**TanStack Query**.

Typical patterns:

```tsx
// Conceptual — mock a hook or provide a test QueryClient
jest.mock("@/features/invoices/model/use-invoices", () => ({
  useInvoices: () => ({ data: mockInvoices, isLoading: false }),
}));
```

Or wrap UI in a real `QueryClientProvider` with a fresh client and seed cache — more
realistic than mocking the hook.

This invoice MVP is still **server-first** (RSC + Supabase). There is no invoice Redux /
Zustand store to mock. Item 7 does not invent a store only to demonstrate store mocking.

---

## When NOT to mock

Do **not** mock:

| Avoid mocking | Why |
|---|---|
| Pure helpers (`formatCurrency`, `formatInvoiceStatus`, `toInvoice`) | They are cheap, deterministic, and *are* the behavior |
| Presentational components you are trying to verify | You would test a fake UI |
| Everything “just in case” | Over-mocking → green tests that lie |
| Your own validation rules inside the form | Assert visible errors instead |

**Mock external systems** (DB, network, third-party SDKs, clocks when they own the
behavior). **Prefer real** domain transforms and UI you own.

Phase key insight:

> Mock external systems. Avoid mocking your own business logic whenever possible.

---

## Realism vs isolation

```text
more isolation ←————————————————————————→ more realism

jest.fn callback   module mock   SDK mock   MSW   real service
```

- **More isolation** → faster, offline, deterministic; risk of testing a fantasy stack.
- **More realism** → higher confidence the integration works; slower, flakier, needs env.

Item 7 chooses a **two-boundary** approach for Create Invoice:

1. **Mutation unit tests** — mock Supabase `createClient` (external system); keep
   `createInvoice` + `toInvoice` real.
2. **Wiring / interaction tests** — mock `createInvoiceAction` while driving the form
   with `userEvent` (real UI behavior, fake persistence).

Together they prove: “form emits the right payload” (Item 5) **and** “write use-case
talks to Supabase correctly when the client is faked” **and** “view calls the write
path on submit” — without a live database.

---

## Common beginner mistakes

- Mocking the component under test instead of its dependency.
- Mocking pure functions and then “proving” the mock returns what you configured.
- Leaving `mockResolvedValue` from a previous test (always `mockReset` / clear).
- Asserting mock call order that mirrors implementation, not user-visible contracts.
- Hitting real Supabase in CI because the mock targeted the wrong module path.
- Installing MSW / rewriting architecture only to make a unit test “look async.”
- Adding both `server.ts` and a `server/` folder at the same path (module resolution
  collision) — use `server/index.ts` or `server.ts` alone, not both.

---

## Test comment convention

Every new or changed test file in Item 7 comments the first use of:

- `jest.fn` / `jest.mocked` / `mockResolvedValue` / `mockRejectedValue` / `mockReset`;
- `jest.mock` for Supabase or `createInvoiceAction`;
- any Supabase client chain fake (`.from().insert()…`);
- `userEvent` when driving the form through the wired view;
- `waitFor` when the form voids an async `onSubmit` Promise;
- why this boundary was mocked (external system) and what stayed real.

Comments teach syntax and **boundary choice**, not fixture narration.

---

## In this project

### Production write path

```text
CreateInvoiceForm (callbacks)
  → CreateInvoiceView.handleSubmit
    → createInvoiceAction ("use server")
      → createInvoice (entity mutation)
        → createClient() → .from("tl_invoices").insert(...).select(...).single()
        → toInvoice(row)
  → router.refresh() + router.push("/invoices")
```

| Layer | Path | Role |
|---|---|---|
| Entity mutation | `entities/invoice/mutations/create-invoice.ts` | Insert snake_case; map via `toInvoice` |
| Entity server barrel | `entities/invoice/server.ts` | Exports `listInvoices`, `createInvoice`, `CreateInvoiceInput` |
| Feature action | `features/create-invoice/server/create-invoice-action.ts` | Maps `NewInvoiceInput` → entity input |
| Feature server barrel | `features/create-invoice/server/index.ts` | Client-safe import: `@/features/create-invoice/server` |
| View wiring | `views/invoices/ui/create-invoice-view.tsx` | Awaits action; alert on failure; navigate on success |

Client barrels (`@/entities/invoice`, `@/features/create-invoice`) stay free of
`next/headers`. The entity must not import the feature; mapping happens in the action.

`CreateInvoiceForm` remains callback-driven — Item 5 tests are unchanged.

### Two mock boundaries

| Test | Mock | Stays real |
|---|---|---|
| **A** Mutation | `@/lib/supabase/server` (`createClient` + chain) | `createInvoice`, `toInvoice` |
| **B** Wiring | `createInvoiceAction` + `next/navigation` `useRouter` | Form UI, view error alert |

**A** proves snake_case insert + domain return / thrown Supabase errors.  
**B** proves submit → action payload → navigation or `role="alert"`.

Not added: MSW, fetch mocks, store mocks, fake timers, mocking formatters/table UI.

### Fixtures

`tests/fixtures/invoices.ts` adds (aligned with `validInvoiceInput`):

- `createdInvoice` — domain result for mocked action success;
- `expectedCreateInvoiceInsert` — snake_case `.insert()` payload;
- `createdInvoiceRow` — raw row for fake `.select().single()`.

### Test paths

| Path | File | How |
|---|---|---|
| **Mutation success** | `create-invoice.test.ts` | Fake `.from().insert().select().single()` → domain invoice |
| **Mutation failure** | same | `{ error }` → `rejects.toThrow("Failed to create invoice: …")` |
| **Wiring success** | `create-invoice-view.test.tsx` | `userEvent` fill + submit → action once → `refresh` + `push` |
| **Wiring failure** | same | `mockRejectedValue` → alert text; no navigation |

### Verification

```bash
npm test
# 10 suites, 41 tests (Items 2–7)

npm test -- \
  tests/unit/entities/invoice/mutations/create-invoice.test.ts \
  tests/unit/views/invoices/ui/create-invoice-view.test.tsx
# 2 mutation + 2 wiring = 4 Item 7 tests

npm run test:coverage -- \
  --collectCoverageFrom='entities/invoice/mutations/**/*.{ts,tsx}' \
  --collectCoverageFrom='features/create-invoice/**/*.{ts,tsx}' \
  --collectCoverageFrom='views/invoices/ui/create-invoice-view.tsx'
```

Contracts matter more than a percentage. Confirm failure paths are exercised and no
test needs Supabase credentials.

### Conceptual checks

- Do Create Invoice tests run with the network unplugged? **Yes.**
- Would inserting a row in a test leave `tl_invoices` unchanged? **Yes** (client/action mocked).
- Did we mock Supabase / the action, or our own `formatCurrency`? **External only.**

---

## Key insight

**Mock external systems. Avoid mocking your own business logic whenever possible.**

A mock of Supabase protects you from the database. A mock of your own transform protects
you from learning whether the transform works.
