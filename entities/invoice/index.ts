/**
 * @file entities/invoice/index.ts
 * Public API of the invoice entity — client-safe surface only.
 *
 * Purpose: expose domain types and pure helpers while keeping server I/O private.
 * Used in: features, views, and tests that need Invoice shapes / status lists.
 * Used for: enforcing FSD public API without pulling next/headers into clients.
 *
 * Server use-cases (listInvoices, createInvoice, …) live in
 * `@/entities/invoice/server`.
 */

///////////////////////////////////////////////////////////////
// Domain types + status list.
export {
  INVOICE_STATUSES,
  type Invoice,
  type InvoiceRow,
  type InvoiceStatus,
} from "./model/invoice";

// Transform (pure — safe for client and tests).
export { toInvoice } from "./transform/to-invoice";
