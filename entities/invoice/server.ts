/**
 * @file entities/invoice/server.ts
 * Server-only public API of the invoice entity.
 *
 * Purpose: expose read/write use-cases that depend on next/headers (cookies)
 *          without polluting the client-safe `@/entities/invoice` barrel.
 * Used in: Server Components / Route Handlers (e.g. views/invoices/ui/invoices-section).
 * Used for: keeping listInvoices / createInvoice out of client bundles.
 *
 * Steps:
 * 1. Re-export server-only query/mutation entry points from here only.
 */

export { listInvoices } from "./queries/list-invoices";
export { createInvoice } from "./mutations/create-invoice";
export type { CreateInvoiceInput } from "./mutations/create-invoice";
