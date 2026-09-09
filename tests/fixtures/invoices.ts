/**
 * @file tests/fixtures/invoices.ts
 * Shared mock Invoice / NewInvoiceInput / insert shapes for invoice tests.
 *
 * Used by: tests under tests/unit/ and tests/integration/ that need invoice props.
 * Used for: stable, reusable fixtures so suites do not invent conflicting mock shapes.
 *
 * Steps:
 * 1. Export one canonical mockInvoice with all Invoice fields populated.
 * 2. Export mockInvoices (two rows) for list / row-count assertions.
 * 3. Export validInvoiceInput for CreateInvoiceForm submit assertions (Item 5).
 * 4. Export createdInvoice + insert fixtures for createInvoice / view wiring (Item 7).
 */

import type { Invoice, InvoiceRow } from "@/entities/invoice";
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

///////////////////////////////////////////////////////////////
// Item 7 — create mutation / wiring fixtures (aligned with validInvoiceInput).

/**
 * Domain Invoice returned after a successful create (id / createdAt from “DB”).
 * Use as mockResolvedValue for createInvoice / createInvoiceAction in wiring tests.
 */
export const createdInvoice: Invoice = {
  id: "inv-new-001",
  customer: validInvoiceInput.customer,
  amount: validInvoiceInput.amount,
  status: validInvoiceInput.status,
  dueDate: validInvoiceInput.dueDate,
  createdAt: "2026-09-09T12:00:00.000Z",
};

/**
 * Snake_case insert payload createInvoice should pass to Supabase `.insert(...)`.
 * Assert against this in mutation unit tests (external boundary, not domain camelCase).
 */
export const expectedCreateInvoiceInsert = {
  customer: validInvoiceInput.customer,
  amount: validInvoiceInput.amount,
  status: validInvoiceInput.status,
  due_date: validInvoiceInput.dueDate,
} as const;

/**
 * Raw `tl_invoices` row a mocked `.select().single()` should resolve with on success.
 * Maps to {@link createdInvoice} via real `toInvoice`.
 */
export const createdInvoiceRow: InvoiceRow = {
  id: createdInvoice.id,
  customer: createdInvoice.customer,
  amount: createdInvoice.amount,
  status: createdInvoice.status,
  due_date: createdInvoice.dueDate,
  created_at: createdInvoice.createdAt,
};
