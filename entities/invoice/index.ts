/**
 * @file entities/invoice/index.ts
 * Public API of the invoice entity — the only module outside code may import.
 *
 * Purpose: expose the invoice domain types and use-cases while keeping internal
 *          layers (model/transform/queries) private.
 * Used in: app/invoices and any future feature/view that works with invoices.
 * Used for: enforcing the "only index is public" rule from file-structure.md.
 */

///////////////////////////////////////////////////////////////
// Domain types + status list.
export {
  INVOICE_STATUSES,
  type Invoice,
  type InvoiceRow,
  type InvoiceStatus,
} from "./model/invoice";

// Read use-cases.
export { listInvoices } from "./queries/list-invoices";

// Transform (exposed for tests / reuse when mapping raw rows).
export { toInvoice } from "./transform/to-invoice";
