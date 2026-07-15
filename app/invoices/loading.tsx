/**
 * @file app/invoices/loading.tsx
 * Route-level loading UI for /invoices.
 *
 * Purpose: Next renders this automatically (wrapped in a Suspense boundary)
 *          while the invoices segment loads on navigation.
 * Used in: route /invoices (framework convention).
 * Used for: an instant, layout-stable skeleton on first paint / navigation.
 */

import { InvoicesTableSkeleton } from "@/views/invoices/ui/invoices-table-skeleton";

/**
 * Render the invoices loading state (header + table skeleton).
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Loaded from Supabase (tl_invoices).
        </p>
      </header>
      <InvoicesTableSkeleton />
    </main>
  );
}
