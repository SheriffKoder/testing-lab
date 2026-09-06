/**
 * @file tests/unit/views/invoices/ui/invoices-table.test.tsx
 * Component tests for InvoicesTable — empty state, populated rows, table structure.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: locking visible behavior (empty copy, row content, column headers)
 * without snapshots or class-name assertions.
 *
 * RTL syntax used here:
 * - render()      — mount component into jsdom
 * - screen        — query the rendered document
 * - getByRole()   — find by accessibility role (throws if missing)
 * - getAllByRole() — find when multiple matches are expected
 * - getByText()   — find by visible text content
 * - queryByRole() — like getByRole but returns null when absent (no throw)
 * - toBeInTheDocument() — jest-dom matcher (element in / not in DOM)
 *
 * findBy* is async (Item 6) — not used here; InvoicesTable is sync + props-driven.
 */

import { render, screen } from "@testing-library/react";
import { InvoicesTable } from "@/views/invoices/ui/invoices-table";
import { mockInvoices } from "@/tests/fixtures/invoices";

// describe() — groups related cases; nested describe = behavior slice.
describe("InvoicesTable", () => {
  describe("empty state", () => {
    it("shows the empty message when invoices is an empty array", () => {
      // render() — mounts JSX into jsdom; prefer screen queries over container.
      render(<InvoicesTable invoices={[]} />);

      // getByText() — throws if text not found (element must exist).
      expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    });

    it("shows the seed hint under the empty message", () => {
      render(<InvoicesTable invoices={[]} />);

      // Regex match — partial text is fine when the full string is long.
      expect(
        screen.getByText(/Seed the tl_invoices table/),
      ).toBeInTheDocument();
    });

    it("does not render a table when there are no invoices", () => {
      render(<InvoicesTable invoices={[]} />);

      // queryByRole() — returns null instead of throwing; use for "must NOT exist".
      // toBeInTheDocument() — jest-dom matcher registered in tests/setupTests.ts.
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("populated table", () => {
    it("renders a table when invoices are provided", () => {
      render(<InvoicesTable invoices={mockInvoices} />);

      // getByRole("table") — prefers semantics over class names / test ids.
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("renders each customer name", () => {
      render(<InvoicesTable invoices={mockInvoices} />);

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Globex")).toBeInTheDocument();
    });

    it("renders formatted amounts from formatCurrency", () => {
      render(<InvoicesTable invoices={mockInvoices} />);

      // Smoke only — full currency edge cases live in Item 3 unit tests.
      expect(screen.getByText("$1,200.00")).toBeInTheDocument();
      expect(screen.getByText("$499.50")).toBeInTheDocument();
    });

    it("renders status labels from formatInvoiceStatus", () => {
      render(<InvoicesTable invoices={mockInvoices} />);

      expect(screen.getByText("Paid")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("renders a header row plus one body row per invoice", () => {
      render(<InvoicesTable invoices={mockInvoices} />);

      // getAllByRole("row") — returns every <tr>; count includes the thead row.
      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(1 + mockInvoices.length);
    });
  });

  describe("column structure", () => {
    // Phase doc "heading exists" → column headers on this isolated table
    // (page <h1>Invoices</h1> lives in app/invoices/page.tsx — out of scope).

    it("exposes Customer, Status, Amount, and Due date column headers", () => {
      render(<InvoicesTable invoices={mockInvoices} />);

      // getByRole("columnheader", { name }) — <th scope="col"> accessible name.
      expect(
        screen.getByRole("columnheader", { name: "Customer" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Status" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Amount" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Due date" }),
      ).toBeInTheDocument();
    });
  });
});
