# Async Testing

> Phase 1 · Item 6.

Item 5 tested interactions that completed immediately. Item 6 covers UI whose result
arrives later: the invoices route starts in a loading state, waits for
`listInvoices()`, and then shows invoices, an empty state, or an error state.

The important behavior is not the duration of the request. It is the transition:

```text
loading → success
loading → empty
loading → error
```

Tests control when the asynchronous work resolves or rejects. They must never wait an
arbitrary number of milliseconds and hope the UI has changed.

---

## The invoices route we test

The route already separates the relevant responsibilities:

- `InvoicesTableSkeleton` renders the loading state.
- `InvoicesSection` awaits `listInvoices()` and renders `InvoicesTable`.
- `InvoicesTable` renders either rows or the empty state.
- `app/invoices/error.tsx` renders the route error state and a retry button.

`InvoicesSection` is an **async Server Component**. Jest runs in jsdom, not inside the
Next.js server runtime. Therefore, the tests do not pretend that Jest can reproduce
the complete App Router streaming lifecycle.

Instead, Item 6 tests each contract at the correct boundary:

1. render and assert the loading fallback;
2. mock `listInvoices()` as resolved, await `InvoicesSection()`, then render its result;
3. resolve with `[]` to verify the empty state;
4. reject the fetch to verify that `InvoicesSection()` throws;
5. render the route error UI separately and verify its visible message and retry action.

This gives useful confidence without changing production architecture merely to make a
test easier. Full Next.js streaming and error-boundary integration belongs in a later
integration or end-to-end test.

---

## `findBy`

`findBy` queries wait for an element to appear:

```tsx
expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
```

Conceptually, a `findBy` query is:

```tsx
await waitFor(() => screen.getByText("Acme Corp"));
```

Use `findBy...` when:

- one element should appear after asynchronous work;
- the query itself expresses the expected result clearly.

Common forms:

- `findByRole(...)` — one accessible element;
- `findByText(...)` — one visible text match;
- `findAllByRole(...)` — multiple elements.

Do not use `findBy` for content that is already present synchronously. Use `getBy`
instead; it communicates that no waiting is expected.

---

## `waitFor`

`waitFor` repeatedly runs an assertion until it passes or RTL's timeout expires:

```tsx
await waitFor(() => {
  expect(onRetry).toHaveBeenCalledTimes(1);
});
```

Use `waitFor` when the expected result is not naturally expressed as a single element
query, such as:

- a mock function eventually being called;
- several assertions becoming true together;
- an element eventually being removed or changing state.

Rules:

- Put an **assertion** inside `waitFor`.
- Keep side effects outside it. Do not click or submit inside `waitFor`, because its
  callback may run more than once.
- Do not add `waitFor` around every assertion. Unnecessary waiting makes tests slower and
  can hide incorrect assumptions about synchronous behavior.

For disappearance, prefer RTL's purpose-built helper:

```tsx
await waitForElementToBeRemoved(() =>
  screen.getByRole("status", { name: "Loading invoices" }),
);
```

---

## Loading states

A loading test should first prove the fallback is visible:

```tsx
render(<InvoicesTableSkeleton />);

expect(
  screen.getByRole("status", { name: "Loading invoices" }),
).toBeInTheDocument();
```

The test queries `role="status"` and its accessible name rather than CSS classes such as
`animate-pulse`. Users and assistive technology experience the status; class names are
implementation details.

For a true client-side loader, a deferred promise can keep the request pending until the
test explicitly resolves it. The invoices route currently fetches in a Server Component,
so Item 6 tests its fallback and resolved/rejected contracts separately rather than
building a fake client component.

---

## Async rendering

An ordinary Client Component is rendered as JSX:

```tsx
render(<SomeClientComponent />);
```

An async Server Component returns a promise. In the Jest unit test, call and await it
before passing the resolved React element to RTL:

```tsx
mockedListInvoices.mockResolvedValue(mockInvoices);

const section = await InvoicesSection();
render(section);
```

This tests the component's fetch-to-render contract while avoiding unsupported assumptions
about Next.js streaming inside jsdom.

When the loader returns no records:

```tsx
mockedListInvoices.mockResolvedValue([]);

const section = await InvoicesSection();
render(section);

expect(screen.getByText("No invoices yet")).toBeInTheDocument();
```

When the loader fails, assert the rejected promise:

```tsx
mockedListInvoices.mockRejectedValue(new Error("Database unavailable"));

await expect(InvoicesSection()).rejects.toThrow("Database unavailable");
```

The thrown error is what allows Next.js to select `app/invoices/error.tsx`.

---

## Mocking the invoice fetch

Item 6 uses a narrow module mock so each async outcome is deterministic:

```tsx
jest.mock("@/entities/invoice/queries/list-invoices", () => ({
  listInvoices: jest.fn(),
}));

const mockedListInvoices = jest.mocked(listInvoices);
```

Then each test chooses one outcome:

```tsx
mockedListInvoices.mockResolvedValue(mockInvoices); // success
mockedListInvoices.mockResolvedValue([]);           // empty
mockedListInvoices.mockRejectedValue(error);        // failure
```

This prevents a real Supabase request and lets us control the promise. Item 7 explains
module, fetch, API, and Supabase mocking in depth.

`mockResolvedValue` and `mockRejectedValue` are promise-specific shortcuts. They are
equivalent to mock implementations returning `Promise.resolve(value)` or
`Promise.reject(error)`.

---

## Fake timers

Jest fake timers replace timer APIs such as `setTimeout`:

```tsx
jest.useFakeTimers();
jest.advanceTimersByTime(1_000);
jest.useRealTimers();
```

They are useful for timer-driven behavior:

- debouncing;
- delayed notifications;
- polling intervals;
- retry backoff.

They are **not** a general way to resolve promises or network requests. The invoices
loader is promise-driven and has no deliberate timer, so Item 6 explains fake timers
but does not use them in the invoice tests. Adding `setTimeout` only to demonstrate
fake timers would test artificial behavior.

If fake timers are used later with `userEvent`, configure the user with an
`advanceTimers` callback and always restore real timers after the test.

---

## Common mistakes

### Arbitrary sleeps

```tsx
// Avoid: slow and flaky.
await new Promise((resolve) => setTimeout(resolve, 500));
```

The application may finish earlier or later than 500 ms. Wait for the observable result
with `findBy`, `waitFor`, or a controlled promise.

### Forgetting `await`

```tsx
// Wrong: the assertion receives a Promise.
screen.findByText("Acme Corp");

// Correct:
expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
```

Also await async Server Components, `userEvent` calls, `waitFor`, and rejected-promise
assertions.

### Using `getBy` too early

`getByText` throws immediately. If content is expected to appear later, use `findByText`.

### Side effects inside `waitFor`

Do not place `user.click()` or state-changing calls inside `waitFor`; RTL may repeat the
callback. Perform the action once, then wait for its result.

### Mixing fake and real timers

Fake timers can leak into later tests. Restore them with `jest.useRealTimers()` in cleanup.

### Testing implementation details

Do not assert that a promise exists or inspect internal loading state. Assert what the
user sees: status, rows, empty copy, error alert, and retry button.

### Expecting Jest to reproduce the entire App Router

Unit tests can verify the pieces and promise contracts. They do not fully prove server
streaming, route-level Suspense, or Next's automatic error-boundary selection.

---

## In this project

### Architecture (server-first)

Production stays server-first:

| Piece | Role |
|---|---|
| `InvoicesTableSkeleton` | Suspense / route loading fallback |
| `InvoicesSection` | async Server Component → `await listInvoices()` → `InvoicesTable` |
| `listInvoices` | server query (`@/entities/invoice/server` → `queries/list-invoices`) |
| `app/invoices/error.tsx` | route error UI + `reset` retry |

We do **not** convert the list to client-side fetching just to simulate a loading
transition in Jest.

### Why `await InvoicesSection()` then `render(section)`

jsdom is not the App Router. Writing `render(<InvoicesSection />)` would not run Next's
RSC / Suspense / streaming. Instead:

1. control the promise with `mockResolvedValue` / `mockRejectedValue`;
2. `const section = await InvoicesSection()`;
3. `render(section)` and assert DOM output.

The async work finishes during the `await`. `findBy` in the success case demonstrates
the API; it does **not** claim jsdom is streaming.

### Test paths

| Path | File | How |
|---|---|---|
| **Loading** | `invoices-table-skeleton.test.tsx` | sync `getByRole("status")` + SR copy |
| **Success** | `invoices-section.test.tsx` | `mockResolvedValue(mockInvoices)` → await → table + Acme Corp |
| **Empty** | same | `mockResolvedValue([])` → "No invoices yet", no table |
| **Rejected fetch** | same | `mockRejectedValue` → `.rejects.toThrow` (error escapes) |
| **Error / retry** | `error.test.tsx` | render `InvoicesError` + `user.click` Try again → `reset` once |

`waitFor` is **not** used — every outcome is already controlled by awaiting the
component, `.rejects`, or `await user.click`. Fake timers and arbitrary sleeps are
also unused.

### Query mock boundary

```tsx
jest.mock("@/entities/invoice/queries/list-invoices", () => ({
  listInvoices: jest.fn(),
}));
```

- Deep-import the query module in the **test** so the mock targets the exact dependency.
- Production still imports via `@/entities/invoice/server`; Jest replaces the underlying
  module before the barrel re-exports it.
- `jest.config.ts` maps `^@/(.*)$` → `<rootDir>/$1` so `jest.mock("@/...")` resolves
  (SWC rewrites import paths; Jest's mock registry needs `moduleNameMapper`).

No credentials, cookies, or network.

### Files

| Role | Path |
|---|---|
| Skeleton tests | `tests/unit/views/invoices/ui/invoices-table-skeleton.test.tsx` |
| Section async tests | `tests/unit/views/invoices/ui/invoices-section.test.tsx` |
| Route error tests | `tests/unit/app/invoices/error.test.tsx` |
| Fixtures | `tests/fixtures/invoices.ts` (`mockInvoices`) |
| Jest alias map | `jest.config.ts` (`moduleNameMapper`) |

### Test comment convention

Each new test file:

- opens with a `@file` header listing Jest / RTL / userEvent APIs it introduces;
- comments the first use of `jest.mock`, `jest.mocked`, `mockResolvedValue` /
  `mockRejectedValue`, `await InvoicesSection()`, `findBy*`, `.rejects`, and
  `userEvent` / `user.click` where relevant;
- states honestly that success `findBy` is after a resolved await, not streaming;
- does **not** narrate fixture data line-by-line.

### Verification

```bash
npm test
# 8 suites, 37 tests (Items 2–6)

npm test -- \
  tests/unit/views/invoices/ui/invoices-table-skeleton.test.tsx \
  tests/unit/views/invoices/ui/invoices-section.test.tsx \
  tests/unit/app/invoices/error.test.tsx
# 2 skeleton + 3 section + 1 error = 6 Item 6 tests

npm run test:coverage -- \
  --collectCoverageFrom='views/invoices/ui/invoices-section.tsx' \
  --collectCoverageFrom='views/invoices/ui/invoices-table-skeleton.tsx' \
  --collectCoverageFrom='app/invoices/error.tsx'
# section + skeleton at 100% statements; error.tsx ~83% (dev-only console.error branch)
```

Global `collectCoverageFrom` still excludes `app/`; use a focused
`--collectCoverageFrom` when you want `error.tsx` in the report. Coverage supports
the contracts — it is not the goal.

---

## Key insight

**Async tests should wait for observable state, not elapsed time.**

Control the async dependency, then assert the loading, success, empty, and error contracts
the user can observe.
