/**
 * @file entities/invoice/transform/to-invoice.ts
 * Pure reshaping: raw `tl_invoices` row -> domain `Invoice`.
 *
 * Purpose: keep snake_case + loose DB types out of the app by mapping them to
 *          the strict camelCase domain shape in one place.
 * Used in: entities/invoice/queries/list-invoices.ts (and future read models).
 * Used for: the only allowed boundary where a DB row becomes an Invoice.
 */

import {
  INVOICE_STATUSES,
  type Invoice,
  type InvoiceRow,
  type InvoiceStatus,
} from "../model/invoice";

/**
 * Narrow an arbitrary DB string into a known {@link InvoiceStatus}.
 *
 * Falls back to `"draft"` for unexpected values so a bad row can never crash a
 * render — the UI still shows the invoice, just with a safe default status.
 *
 * @param value - raw status string from the database
 * @returns a valid InvoiceStatus
 */
function toInvoiceStatus(value: string): InvoiceStatus {
  // Treat the const tuple as a plain string[] just for the membership check.
  const isKnown = (INVOICE_STATUSES as readonly string[]).includes(value);
  return isKnown ? (value as InvoiceStatus) : "draft";
}

/**
 * Map a raw `tl_invoices` row to the domain {@link Invoice} shape.
 *
 * @param row - raw row as returned by Supabase/PostgREST
 * @returns the normalized, strongly-typed Invoice
 */
export function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    customer: row.customer,
    // Coerce because pg `numeric` may serialize as a string.
    amount: Number(row.amount),
    status: toInvoiceStatus(row.status),
    dueDate: row.due_date,
    createdAt: row.created_at,
  };
}
