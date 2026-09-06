# Jest Environment

> Phase 1 · Item 2.

A **stable test environment**: infrastructure that lets us run a `.test.ts(x)`
file, render a component into a fake browser, assert on it, and measure
coverage. Below is every moving part and why it exists, matched to what this
repo actually wired.

---

## Jest

A **test runner** plus assertion library and mocking framework in one package.
It:

- discovers test files (default: `*.test.ts(x)` / `*.spec.ts(x)` / files in
  `__tests__/`),
- runs them in isolated environments (one per file, in parallel workers),
- gives us the globals `describe` / `it` / `test` / `expect`,
- provides mocking (`jest.fn`, `jest.mock`, `jest.spyOn`) and coverage (via
  Istanbul) out of the box.

Jest runs on **Node**, not a browser — which is why we need jsdom.

## jsdom

A pure-JavaScript implementation of the **DOM and HTML standards** that runs
inside Node. It gives our tests `document`, `window`, elements, events — enough
of a browser for React to render into and for RTL to query. It is **not** a real
browser (no layout, no paint, limited navigation), which is fine for component
behavior but is why true end-to-end testing later uses Playwright.

We opt in with `testEnvironment: "jsdom"` — Jest's default is `node`, and
forgetting this is the classic "`document is not defined`" error.

## React Testing Library (RTL)

`@testing-library/react` renders a component into jsdom and hands us queries to
find elements **the way a user would** — by role, label, and text — rather than
by internal state or CSS classes. Key pieces we'll use:

- `render(<Component />)` — mount into jsdom.
- `screen` — the query entry point (`getByRole`, `queryByText`, `findByRole`…).
- `@testing-library/user-event` — realistic user interaction (typing, clicking).
- `@testing-library/jest-dom` — extra matchers (`toBeInTheDocument`,
  `toHaveTextContent`, `toBeDisabled`…) that read naturally.

RTL is runner-agnostic; the same queries work under Vitest later.

## `jest.config.ts`

Repo-root config. We wrap `next/jest` and override:

- `testEnvironment: "jsdom"` — render into a fake DOM.
- `setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"]` — run setup before
  each file (setup lives in the FSD `tests/` unit).
- `collectCoverageFrom` — measure FSD source layers (`entities/`, `features/`,
  `views/`, `widgets/`, `shared/`); skip barrels and `.d.ts`. No hard
  `coverageThreshold` yet (Item 8).
- `moduleNameMapper` for `@/*` — handled by `next/jest` via `tsconfig` paths
  (no manual mapper needed so far).

The config is TypeScript, so `ts-node` is a devDependency so Jest can load it.

## `tests/setupTests.ts`

Jest runs this **before every test file** (via `setupFilesAfterEnv`). It lives
under `tests/` — the FSD testing unit — not the repo root. It starts as:

```ts
import "@testing-library/jest-dom";
```

That import registers custom matchers so every test can use
`expect(el).toBeInTheDocument()`. Add global mocks (e.g. `next/navigation`) or
polyfills only when a real test needs them.

## `next/jest`

Next.js ships an official Jest transformer. Calling `nextJest({ dir: "./" })`
returns a `createJestConfig` wrapper that automatically:

- compiles TS/JSX/TSX with **SWC** (fast, matches Next's own build),
- loads `next.config` and `.env*` files,
- wires up **CSS Modules** and image/asset imports as mocks,
- respects `tsconfig` `paths` (our `@/*` alias),
- sets sane `transformIgnorePatterns`.

We wrap our own overrides (jsdom, setup file, coverage) and export the result.

## Why Next.js needs extra configuration

A bare Jest install understands plain JS on Node. A Next app needs more:

1. **TS + JSX transform** — Jest must compile `.tsx`; `next/jest` uses SWC so we
   don't hand-configure `babel`/`ts-jest`.
2. **Path aliases** — `@/entities/invoice` must resolve; comes from `tsconfig`
   `paths` via `next/jest` (or a manual `moduleNameMapper`).
3. **Non-JS imports** — `import "./x.css"` or importing an image would crash Node;
   `next/jest` stubs them.
4. **Env + `next.config`** — some code reads env at import time.
5. **Browser globals** — components expect `document`/`window` → `jsdom`.

Without these you hit a cascade of `Unexpected token`, `Cannot find module '@/…'`,
and `document is not defined` errors — exactly what `next/jest` + `jsdom` remove.

## Scripts and layout

`package.json` scripts (Vitest left installed for a later comparison):

```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

FSD `tests/` tree:

```text
tests/
├── setupTests.ts
├── unit/           # e.g. sanity.test.ts
├── integration/
├── e2e/
└── fixtures/
```

Coverage output goes to `/coverage`, which is git-ignored.

## Common pitfalls

- **Wrong `testEnvironment`** → `document is not defined`. Must be `jsdom`.
- **Path alias not resolving** (`Cannot find module '@/…'`) → ensure `next/jest`
  is used, or add `moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" }`.
- **ESM-only dependency not transformed** (`Unexpected token 'export'`) → adjust
  `transformIgnorePatterns`; usually unnecessary with `next/jest`.
- **TS config file needs a loader** — Jest reading `jest.config.ts` requires
  `ts-node` (or use `jest.config.mjs`/`.cjs` to avoid it).
- **Server Components** — `async` server components (e.g. `InvoicesSection`)
  can't be rendered by RTL in Jest *or* Vitest. Test the pure child
  (`InvoicesTable`) with props instead.
- **`next/navigation` / `next/headers`** — must be mocked in tests that import
  code using them, or the import throws outside a request scope.
- **Missing web globals** — some libs expect `fetch`/`Request`/`Response`; add
  polyfills in `tests/setupTests.ts` only if a real error appears (don't pre-add).
- **`act(...)` warnings** — always `await` `userEvent` calls and `findBy*`
  queries; never assert synchronously on async UI.
- **Coverage ≠ done** — a green, high-coverage setup still proves nothing about
  behavior; Item 2 only proves the *pipeline* runs (see Item 1 for the why).

---

## What "done" looks like (verification)

- `npm test` runs and shows one **passing** example test
  (`tests/unit/sanity.test.ts`).
- `npm run test:coverage` produces a coverage report without errors.
- No `document is not defined` / alias-resolution errors.
