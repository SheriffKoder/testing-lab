/**
 * @file tests/unit/sanity.test.ts
 * Smoke test for the Jest + jsdom pipeline — proves the runner and fake DOM work
 * before any domain tests (Item 3+).
 *
 * Used by: `npm test` as the first suite discovered under tests/unit/.
 * Used for: infrastructure proof only (assertions + document global), not app behavior.
 *
 * Steps:
 * 1. Assert Jest globals (describe / it / expect) evaluate correctly.
 * 2. Assert jsdom exposes `document` (testEnvironment: "jsdom" is active).
 */

/////////////////////////////////////////////////////////////
// describe — groups related cases into one suite (shows as a block in the report).
describe("test environment", () => {
  // it — one test case; alias of test(). Failures name this string in the output.
  it("runs and evaluates assertions", () => {
    // expect(...).toBe(...) — strict equality matcher (===) for primitives.
    expect(1 + 1).toBe(2);
  });

  it("has a jsdom document available", () => {
    // document is a browser global; absent under Jest's default "node" environment.
    expect(typeof document).not.toBe("undefined");
  });
});
