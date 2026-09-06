/**
 * @file tests/unit/entities/invoice/lib/format-invoice-status.test.ts
 * Unit tests for formatInvoiceStatus — known labels and unknown-status fallback.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: locking status display rules so UI copy cannot silently drift.
 */

import { formatInvoiceStatus } from "@/entities/invoice/lib/format-invoice-status";

// describe() — groups related tests under one label (shows up in failure output).
describe("formatInvoiceStatus", () => {
  // it.each`…` — table-driven tests: one row = one run with the same assertion shape.
  it.each([
    ["draft", "Draft"],
    ["pending", "Pending"],
    ["paid", "Paid"],
    ["overdue", "Overdue"],
  ] as const)("formats known status %s → %s", (status, label) => {
    // expect(actual).toBe(expected) — strict equality (===) for strings.
    expect(formatInvoiceStatus(status)).toBe(label);
  });

  it("falls back to Draft for an unknown status", () => {
    // Business rule: junk DB values must not crash or show raw text in the UI.
    expect(formatInvoiceStatus("unknown")).toBe("Draft");
  });

  it("falls back to Draft for an empty string", () => {
    expect(formatInvoiceStatus("")).toBe("Draft");
  });
});
