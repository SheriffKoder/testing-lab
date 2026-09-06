/**
 * @file tests/unit/shared/lib/format-currency.test.ts
 * Unit tests for formatCurrency — verifies USD formatting rules and edge cases.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: locking the display contract so UI refactors cannot silently change money text.
 */

import { formatCurrency } from "@/shared/lib/format-currency";

// describe() — groups related tests under one label (shows up in failure output).
describe("formatCurrency", () => {
  // it() — one concrete behavior / example (alias: test()).
  it("formats whole dollars with grouping and two decimal places", () => {
    // expect(actual).toBe(expected) — strict equality assertion (===).
    expect(formatCurrency(1200)).toBe("$1,200.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats amounts with cents", () => {
    expect(formatCurrency(19.99)).toBe("$19.99");
  });

  it("formats negative amounts (refunds / credits)", () => {
    // Documented decision: negatives are allowed and rendered with a leading minus.
    expect(formatCurrency(-50)).toBe("-$50.00");
  });

  it("formats large amounts with thousand separators", () => {
    expect(formatCurrency(1_000_000)).toBe("$1,000,000.00");
  });
});
