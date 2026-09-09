/**
 * @file entities/invoice/mutations/create-invoice.ts
 * Write use-case: insert one invoice into `tl_invoices`.
 *
 * Purpose: persist a new invoice on the server and return it as a domain Invoice.
 * Used in: create-invoice server action / view wiring (via @/entities/invoice/server).
 * Used for: the single write model behind Create Invoice — keeps Supabase I/O out of
 *          features/ and app/.
 *
 * Steps:
 * 1. Create a request-scoped server Supabase client.
 * 2. Insert snake_case columns; select the full row back (id / created_at from DB).
 * 3. Throw on error; otherwise map the raw row to the domain shape via toInvoice.
 *
 * Note: this module is implicitly server-only — it imports the server Supabase
 * client, which uses `next/headers` (`cookies()`) and hard-fails if ever pulled
 * into a client bundle. No extra `server-only` dependency is needed.
 *
 * Dependency rule: the entity must not import the create-invoice feature. Callers
 * map feature payloads (e.g. NewInvoiceInput) to CreateInvoiceInput at the boundary.
 */

import { createClient } from "@/lib/supabase/server";
import {
  type Invoice,
  type InvoiceRow,
  type InvoiceStatus,
} from "../model/invoice";
import { toInvoice } from "../transform/to-invoice";

/** Columns returned after insert — same set as listInvoices (never `select("*")`). */
const INVOICE_COLUMNS = "id, customer, amount, status, due_date, created_at";

///////////////////////////////////////////////////////////////
// Input — entity-owned write payload (no id / createdAt; DB assigns those).

/**
 * Fields required to create an invoice.
 * Mirrors the form payload shape but lives in the entity so features never become
 * a dependency of this mutation.
 */
export type CreateInvoiceInput = {
  customer: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
};

/**
 * Insert one invoice and return the persisted domain row.
 *
 * @param input - customer, amount, status, and due date (camelCase)
 * @returns a promise resolving to the created {@link Invoice}
 * @throws Error when the Supabase insert fails
 */
export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<Invoice> {
  ///////////////////////////////////////////////////////////////
  // 1. Request-scoped client (reads session from cookies).
  const supabase = await createClient();

  // 2. Insert snake_case columns; `.select().single()` returns id + created_at.
  const { data, error } = await supabase
    .from("tl_invoices")
    .insert({
      customer: input.customer,
      amount: input.amount,
      status: input.status,
      due_date: input.dueDate,
    })
    .select(INVOICE_COLUMNS)
    .single();

  // 3a. Surface DB errors so callers / route error UI can handle them.
  if (error) {
    throw new Error(`Failed to create invoice: ${error.message}`);
  }

  // 3b. Normalize raw row -> domain invoice (PostgREST returns the inserted row).
  return toInvoice(data as InvoiceRow);
}
