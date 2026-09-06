/**
 * @file tests/fixtures/invoices.ts
 * Shared mock Invoice / NewInvoiceInput data for component and interaction tests.
 *
 * Used by: tests under tests/unit/ and tests/integration/ that need invoice props.
 * Used for: stable, reusable fixtures so suites do not invent conflicting mock shapes.
 *
 * Steps:
 * 1. Export one canonical mockInvoice with all Invoice fields populated.
 * 2. Export mockInvoices (two rows) for list / row-count assertions.
 * 3. Export validInvoiceInput for CreateInvoiceForm submit assertions (Item 5).
 */

import type { Invoice } from "@/entities/invoice";
import type { NewInvoiceInput } from "@/features/create-invoice";

/** Minimal single invoice — adjust fields as needed per test. */
export const mockInvoice: Invoice = {
  id: "inv-001",
  customer: "Acme Corp",
  amount: 1200,
  status: "paid",
  dueDate: "2026-08-15",
  createdAt: "2026-07-01T00:00:00.000Z",
};

/** Two invoices with distinct customers for row-count / list tests. */
export const mockInvoices: Invoice[] = [
  mockInvoice,
  {
    id: "inv-002",
    customer: "Globex",
    amount: 499.5,
    status: "pending",
    dueDate: "2026-09-01",
    createdAt: "2026-07-02T00:00:00.000Z",
  },
];

/** A complete, valid Create Invoice form submission (no id / createdAt). */
export const validInvoiceInput: NewInvoiceInput = {
  customer: "Acme Corp",
  amount: 1200,
  status: "pending",
  dueDate: "2026-08-15",
};
