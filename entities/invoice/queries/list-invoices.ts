/**
 * @file entities/invoice/queries/list-invoices.ts
 * Read use-case: load all invoices for the invoices page.
 *
 * Purpose: fetch rows from `tl_invoices` on the server and return them as domain
 *          Invoices, newest first — cached across requests for 2 minutes.
 * Used in: views/invoices/ui/invoices-section.tsx (via @/entities/invoice/server).
 * Used for: the single read model behind the invoices list view.
 *
 * Steps:
 * 1. Run the Supabase select inside Next `unstable_cache` (no cookies()).
 * 2. Select the invoice columns ordered by newest first.
 * 3. Throw on error; otherwise map raw rows to the domain shape.
 *
 * Caching:
 * - `revalidate: 120` — Time-based refresh every 2 minutes.
 * - `tags: ["invoices"]` — On-demand invalidation via `updateTag("invoices")`
 *   after creates (see create-invoice-action).
 *
 * Note: the cached body must not call `cookies()` / `headers()`. That is why
 * this query uses `createPublicServerClient` instead of `lib/supabase/server`.
 */

import { unstable_cache } from "next/cache";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { type Invoice, type InvoiceRow } from "../model/invoice";
import { toInvoice } from "../transform/to-invoice";

/** Columns selected for the list view — kept explicit (never `select("*")`). */
const INVOICE_COLUMNS = "id, customer, amount, status, due_date, created_at";

/** Cache tag shared with create-invoice invalidation. */
export const INVOICES_CACHE_TAG = "invoices";

/**
 * Uncached Supabase read — only invoked on cache miss / revalidation.
 *
 * @returns domain invoices, newest first
 * @throws Error when the Supabase query fails
 */
async function fetchInvoicesFromDb(): Promise<Invoice[]> {
  ///////////////////////////////////////////////////////////////
  // 1. Public client (safe inside unstable_cache — no cookies()).
  const supabase = createPublicServerClient();

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

/**
 * List every invoice, most recently created first.
 *
 * Results are cached for 120 seconds across requests (Next Data Cache).
 *
 * @returns a promise resolving to the domain invoices
 * @throws Error when the Supabase query fails (on cache miss)
 */
export const listInvoices = unstable_cache(
  fetchInvoicesFromDb,
  ["list-invoices"],
  { revalidate: 120, tags: [INVOICES_CACHE_TAG] },
);
