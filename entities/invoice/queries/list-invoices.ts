/**
 * @file entities/invoice/queries/list-invoices.ts
 * Read use-case: load all invoices for the invoices page.
 *
 * Purpose: fetch rows from `tl_invoices` on the server and return them as domain
 *          Invoices, newest first.
 * Used in: views/invoices/ui/invoices-section.tsx (via @/entities/invoice/server).
 * Used for: the single read model behind the invoices list view.
 *
 * Steps:
 * 1. Create a request-scoped server Supabase client.
 * 2. Select the invoice columns ordered by newest first.
 * 3. Throw on error; otherwise map raw rows to the domain shape.
 *
 * Note: this module is implicitly server-only — it imports the server Supabase
 * client, which uses `next/headers` (`cookies()`) and hard-fails if ever pulled
 * into a client bundle. No extra `server-only` dependency is needed.
 */

import { createClient } from "@/lib/supabase/server";
import { type Invoice, type InvoiceRow } from "../model/invoice";
import { toInvoice } from "../transform/to-invoice";

/** Columns selected for the list view — kept explicit (never `select("*")`). */
const INVOICE_COLUMNS = "id, customer, amount, status, due_date, created_at";

/**
 * List every invoice, most recently created first.
 *
 * @returns a promise resolving to the domain invoices
 * @throws Error when the Supabase query fails
 */
export async function listInvoices(): Promise<Invoice[]> {
  ///////////////////////////////////////////////////////////////
  // 1. Request-scoped client (reads session from cookies).
  const supabase = await createClient();

  // 2. Fetch the rows, newest first.
  const { data, error } = await supabase
    .from("tl_invoices")
    .select(INVOICE_COLUMNS)
    .order("created_at", { ascending: false });

  // 3a. Surface DB errors so the route's error boundary can render.
  if (error) {
    throw new Error(`Failed to load invoices: ${error.message}`);
  }

  // 3b. Normalize raw rows -> domain invoices (empty array when no data).
  return ((data ?? []) as InvoiceRow[]).map(toInvoice);
}
