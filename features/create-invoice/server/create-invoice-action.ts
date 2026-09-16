/**
 * @file features/create-invoice/server/create-invoice-action.ts
 * Server action: persist a new invoice from Create Invoice form payloads.
 *
 * Purpose: thin feature boundary between the client view and the entity mutation.
 * Used in: views/invoices/ui/create-invoice-view.tsx (via @/features/create-invoice/server).
 * Used for: accepting NewInvoiceInput on the server and calling createInvoice without
 *          exposing Supabase / next/headers through the client feature barrel.
 *
 * Steps:
 * 1. Accept the feature form payload (NewInvoiceInput).
 * 2. Call createInvoice from @/entities/invoice/server.
 * 3. Invalidate the invoices list Data Cache (read-your-own-writes).
 * 4. Return the created Invoice; rethrow on failure so the view can show an alert.
 */

"use server";

import { updateTag } from "next/cache";
import {
  createInvoice,
  INVOICES_CACHE_TAG,
  type CreateInvoiceInput,
} from "@/entities/invoice/server";
import type { Invoice } from "@/entities/invoice";
import type { NewInvoiceInput } from "../model/new-invoice-input";

/**
 * Persist one invoice from a valid CreateInvoiceForm payload.
 *
 * @param input - customer, amount, status, dueDate from the form
 * @returns the created domain Invoice
 * @throws when the entity mutation fails (Supabase error)
 */
export async function createInvoiceAction(
  input: NewInvoiceInput,
): Promise<Invoice> {
  // Map feature payload → entity input at the boundary (same fields today;
  // keeps the entity free of feature imports if shapes diverge later).
  const entityInput: CreateInvoiceInput = {
    customer: input.customer,
    amount: input.amount,
    status: input.status,
    dueDate: input.dueDate,
  };

  const invoice = await createInvoice(entityInput);

  // Bust list cache so /invoices shows the new row after router.refresh()
  // instead of waiting for the 2-minute revalidate window.
  updateTag(INVOICES_CACHE_TAG);

  return invoice;
}
