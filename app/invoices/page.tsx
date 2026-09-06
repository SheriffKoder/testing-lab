/**
 * @file app/invoices/page.tsx
 * Invoices route — server-rendered shell that streams the invoice table.
 *
 * Purpose: compose the invoices view: a static header plus a Suspense-wrapped
 *          data section. The shell prerenders instantly; the dynamic table
 *          (which reads cookies + hits Supabase) streams inside the boundary,
 *          which is required by Next's `cacheComponents`.
 * Used in: route /invoices.
 * Used for: Phase 0 verification — "invoices appear, data comes from Supabase".
 */

import { Suspense } from "react";
import { InvoicesPageHeader, InvoicesTableSkeleton } from "@/views/invoices";
import { InvoicesSection } from "@/views/invoices/server";

/** Static route metadata. */
export const metadata = {
  title: "Invoices",
};

/**
 * Render the invoices page shell.
 */
export default function InvoicesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Static header + Create invoice link — safe to prerender. */}
      <InvoicesPageHeader />

      {/*
        Dynamic data lives inside Suspense: listInvoices() reads request cookies
        and queries the DB, both of which must be wrapped under cacheComponents.
      */}
      <Suspense fallback={<InvoicesTableSkeleton />}>
        <InvoicesSection />
      </Suspense>
    </main>
  );
}
