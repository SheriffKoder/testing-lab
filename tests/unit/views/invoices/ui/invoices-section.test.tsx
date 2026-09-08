/**
 * @file tests/unit/views/invoices/ui/invoices-section.test.tsx
 * Async tests for InvoicesSection — mocked listInvoices, resolved/rejected outcomes.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: proving the Server Component awaits the query and surfaces success /
 * empty / thrown failure without hitting Supabase.
 *
 * Async Jest + RTL syntax used here:
 * - jest.mock() — replace the real invoice query before imports execute
 * - jest.mocked() — retain the function's TypeScript signature as a Jest mock
 * - mockReset() — clear call history and mock implementations between tests
 * - mockResolvedValue() — make the mock return a fulfilled Promise
 * - mockRejectedValue() — make the mock return a rejected Promise
 * - await InvoicesSection() — resolve the async Server Component before RTL render
 * - findByRole() / findByText() — async query variants (demo’d after await+render)
 * - queryByText() — assert absence without throwing
 * - expect(...).rejects.toThrow() — assert a Promise rejects with a message
 */

import { render, screen } from "@testing-library/react";
import { listInvoices } from "@/entities/invoice/queries/list-invoices";
import { InvoicesSection } from "@/views/invoices/ui/invoices-section";
import { mockInvoices } from "@/tests/fixtures/invoices";

// jest.mock(module, factory) — hoisted above imports. Replaces the query module
// so listInvoices never opens Supabase / next/headers. InvoicesSection imports
// via @/entities/invoice/server, which re-exports this same module; Jest swaps
// the underlying file before the barrel re-exports it.
jest.mock("@/entities/invoice/queries/list-invoices", () => ({
  listInvoices: jest.fn(),
}));

// jest.mocked(fn) — types `listInvoices` as a Jest mock while keeping Invoice[].
// Deep import is test-only so we control this exact dependency.
const mockedListInvoices = jest.mocked(listInvoices);

describe("InvoicesSection", () => {
  beforeEach(() => {
    // mockReset() — drops prior call history AND configured implementations
    // (mockResolvedValue / mockRejectedValue). Prevents one scenario from
    // leaking into the next.
    mockedListInvoices.mockReset();
  });

  it("renders the table when listInvoices resolves with invoices", async () => {
    // mockResolvedValue — next call returns a fulfilled Promise of mockInvoices.
    mockedListInvoices.mockResolvedValue(mockInvoices);

    // await InvoicesSection() — Server Components are async functions. In Jest
    // we resolve the Promise ourselves, then pass the resulting React element
    // to render(). Do NOT write render(<InvoicesSection />): jsdom is not
    // running Next’s RSC/Suspense runtime.
    const section = await InvoicesSection();
    render(section);

    expect(mockedListInvoices).toHaveBeenCalledTimes(1);

    // findByRole / findByText — async queries that retry until the element
    // appears (or timeout). Here the async work already finished during
    // `await InvoicesSection()`; after render(section) the DOM is committed.
    // We still use findBy to practice the API — this does not simulate Next.js
    // streaming.
    expect(
      await screen.findByRole("table", { name: "List of invoices" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();

    // queryByText — sync; returns null when missing (no throw). Empty copy
    // must not appear when invoices are present.
    expect(screen.queryByText("No invoices yet")).not.toBeInTheDocument();
  });

  it("renders the empty state when listInvoices resolves with []", async () => {
    mockedListInvoices.mockResolvedValue([]);

    const section = await InvoicesSection();
    render(section);

    // getByText after render — no further async UI update is pending once the
    // Server Component Promise has resolved; sync getBy is enough here.
    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(mockedListInvoices).toHaveBeenCalledTimes(1);
  });

  it("rejects when listInvoices rejects", async () => {
    const error = new Error("Database unavailable");
    // mockRejectedValue — next call returns a rejected Promise (failure path).
    mockedListInvoices.mockRejectedValue(error);

    // expect(promise).rejects.toThrow — Jest matcher for async rejection.
    // InvoicesSection must let the error escape so Next's route error.tsx can
    // handle it. Do not render the error UI here — Jest is not the App Router.
    await expect(InvoicesSection()).rejects.toThrow("Database unavailable");
    expect(mockedListInvoices).toHaveBeenCalledTimes(1);
  });
});
