/**
 * @file tests/unit/views/invoices/ui/invoices-table-skeleton.test.tsx
 * Loading-state tests for InvoicesTableSkeleton — accessible status + SR copy.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: locking the Suspense/route fallback contract without asserting
 * pulse animation classes or layout chrome.
 *
 * RTL syntax used here:
 * - render()      — mount component into jsdom (synchronous for this fallback)
 * - screen        — query the rendered document
 * - getByRole()   — find by accessibility role + accessible name
 * - getByText()   — find by text content (screen-reader-only copy counts)
 * - toBeInTheDocument() — jest-dom matcher (element in the DOM)
 *
 * findBy* is for async appearance (Item 6 later steps). The skeleton itself
 * paints immediately, so getBy* is correct here.
 */

import { render, screen } from "@testing-library/react";
import { InvoicesTableSkeleton } from "@/views/invoices/ui/invoices-table-skeleton";

describe("InvoicesTableSkeleton", () => {
  it("exposes an accessible loading status", () => {
    // render() is synchronous here: InvoicesTableSkeleton is a plain client
    // component with no promises, effects, or deferred data. After render
    // returns, the loading DOM is already present — use getBy, not findBy.
    render(<InvoicesTableSkeleton />);

    // getByRole("status", { name }) — queries by ARIA role + accessible name.
    // The name comes from aria-label="Loading invoices" on the status region
    // (not from visible heading text). Prefer this over animate-pulse classes:
    // assistive tech and Suspense consumers care about the status announcement,
    // not the decorative shimmer.
    expect(
      screen.getByRole("status", { name: "Loading invoices" }),
    ).toBeInTheDocument();
  });

  it("includes screen-reader loading copy", () => {
    render(<InvoicesTableSkeleton />);

    // getByText finds the sr-only span even when visually hidden.
    expect(screen.getByText("Loading invoices…")).toBeInTheDocument();
  });
});
