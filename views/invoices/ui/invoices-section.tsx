/**
 * @file views/invoices/ui/invoices-section.tsx
 * Async server component that fetches invoices and hands them to the table.
 *
 * Purpose: isolate the dynamic (cookie-reading, DB-hitting) work into a single
 *          Suspense child, so the page shell stays static/prerenderable under
 *          Next's `cacheComponents`.
 * Used in: app/invoices/page.tsx via @/views/invoices (wrapped in <Suspense>).
 * Used for: the server-first data fetch — the client receives ready HTML.
 *
 * Steps:
 * 1. Await the invoices read use-case (server-side).
 * 2. Render the pure presentational table with the result.
 */

import { listInvoices } from "@/entities/invoice/server";
import { InvoicesTable } from "./invoices-table";

/**
 * Fetch invoices on the server and render them.
 *
 * This component intentionally suspends while data loads; its parent supplies
 * the {@link InvoicesTableSkeleton} fallback.
 */
export async function InvoicesSection() {
  // 1. Server-side fetch (throws -> handled by app/invoices/error.tsx).
  const invoices = await listInvoices();

  // 2. Pass data down to the dumb table component.
  return <InvoicesTable invoices={invoices} />;
}
