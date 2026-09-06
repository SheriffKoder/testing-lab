/**
 * @file views/invoices/ui/create-invoice-view.tsx
 * Route composition for /invoices/new — hosts CreateInvoiceForm.
 *
 * Purpose: wire form callbacks to navigation; no Supabase yet (Item 7).
 * Used in: app/invoices/new/page.tsx.
 * Used for: a dedicated create page reachable from the invoices header button.
 *
 * Steps:
 * 1. On cancel → navigate back to /invoices.
 * 2. On valid submit → navigate to /invoices (persistence deferred to Item 7).
 * 3. Render page chrome + CreateInvoiceForm.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CreateInvoiceForm,
  type NewInvoiceInput,
} from "@/features/create-invoice";

/**
 * Create-invoice page body: header + form with router-backed callbacks.
 */
export function CreateInvoiceView() {
  const router = useRouter();

  /** Cancel must not submit — return to the list. */
  function handleCancel() {
    router.push("/invoices");
  }

  /**
   * Valid form emit — persistence arrives in Item 7.
   * For now, accept the payload and return to the list.
   */
  function handleSubmit(_input: NewInvoiceInput) {
    // Item 7 will call the create mutation with `_input` before navigating.
    router.push("/invoices");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create invoice
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in the fields below. Saving to Supabase arrives in a later
            item — submit currently returns to the list.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </header>

      <div className="max-w-md">
        <CreateInvoiceForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </main>
  );
}
