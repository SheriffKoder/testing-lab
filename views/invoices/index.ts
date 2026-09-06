/**
 * @file views/invoices/index.ts
 * Public API of the invoices view — client-safe surface only.
 *
 * Purpose: expose route composition pieces that may enter client bundles.
 * Used in: app/invoices/page.tsx, app/invoices/loading.tsx, app/invoices/new/page.tsx.
 * Used for: enforcing the "only index is public" rule without mixing server I/O.
 *
 * Server-only pieces (InvoicesSection) live in `@/views/invoices/server`.
 */

export { InvoicesPageHeader } from "./ui/invoices-page-header";
export { InvoicesTableSkeleton } from "./ui/invoices-table-skeleton";
export { CreateInvoiceView } from "./ui/create-invoice-view";
