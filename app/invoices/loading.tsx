/**
 * @file app/invoices/loading.tsx
 * Route-level loading UI for /invoices.
 *
 * Purpose: Next renders this automatically (wrapped in a Suspense boundary)
 *          while the invoices segment loads on navigation.
 * Used in: route /invoices (framework convention).
 * Used for: an instant, layout-stable skeleton on first paint / navigation.
 */

import { InvoicesPageHeader, InvoicesTableSkeleton } from "@/views/invoices";

/**
 * Render the invoices loading state (header + table skeleton).
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <InvoicesPageHeader />
      <InvoicesTableSkeleton />
    </main>
  );
}
