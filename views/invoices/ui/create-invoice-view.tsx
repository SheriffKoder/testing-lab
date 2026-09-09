/**
 * @file views/invoices/ui/create-invoice-view.tsx
 * Route composition for /invoices/new — hosts CreateInvoiceForm.
 *
 * Purpose: wire form callbacks to the create-invoice server action + navigation.
 * Used in: app/invoices/new/page.tsx.
 * Used for: a dedicated create page reachable from the invoices header button.
 *
 * Steps:
 * 1. On cancel → navigate back to /invoices.
 * 2. On valid submit → await createInvoiceAction; on success refresh + push /invoices.
 * 3. On action failure → show a visible role="alert" error; do not navigate.
 * 4. Keep CreateInvoiceForm callback-driven (Item 5 tests unchanged).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CreateInvoiceForm,
  type NewInvoiceInput,
} from "@/features/create-invoice";
import { createInvoiceAction } from "@/features/create-invoice/server";

/**
 * Create-invoice page body: header + form with persistence + router callbacks.
 */
export function CreateInvoiceView() {
  const router = useRouter();
  /** Action/network failure message — cleared on the next successful attempt path. */
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Cancel must not submit — return to the list. */
  function handleCancel() {
    router.push("/invoices");
  }

  /**
   * Valid form emit → persist via server action, then return to the list.
   * Persistence stays in the view so CreateInvoiceForm remains a dumb form.
   */
  async function handleSubmit(input: NewInvoiceInput) {
    setSubmitError(null);

    try {
      await createInvoiceAction(input);
      // refresh() so /invoices re-fetches RSC data and shows the new row.
      router.refresh();
      router.push("/invoices");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create invoice";
      setSubmitError(message);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create invoice
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in the fields below. Submit saves the invoice, then returns to
            the list.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </header>

      <div className="max-w-md space-y-4">
        {/* role="alert" — visible persistence failure for users and tests */}
        {submitError ? (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <CreateInvoiceForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </main>
  );
}
