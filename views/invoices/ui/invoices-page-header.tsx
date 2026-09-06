/**
 * @file views/invoices/ui/invoices-page-header.tsx
 * Shared invoices list header: title plus Create invoice action.
 *
 * Purpose: keep the /invoices header (and loading shell) in one place.
 * Used in: app/invoices/page.tsx, app/invoices/loading.tsx.
 * Used for: navigating to /invoices/new beside the page title.
 *
 * Steps:
 * 1. Render the Invoices title + subtitle.
 * 2. Link to /invoices/new labelled "Create invoice".
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Invoices list page header with create action.
 */
export function InvoicesPageHeader() {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Loaded from Supabase (tl_invoices).
        </p>
      </div>

      {/* Link styled as a button — navigates to the create form page. */}
      <Button asChild>
        <Link href="/invoices/new">Create invoice</Link>
      </Button>
    </header>
  );
}
