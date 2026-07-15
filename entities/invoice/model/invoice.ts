/**
 * @file entities/invoice/model/invoice.ts
 * Invoice domain types shared across the invoice entity.
 *
 * Purpose: define the canonical (camelCase) Invoice shape the app renders and,
 *          separately, the raw (snake_case) row shape returned by Postgres.
 * Used in: entities/invoice/transform, entities/invoice/queries and any UI that
 *          renders invoices.
 * Used for: a single source of truth for what an invoice is.
 */

///////////////////////////////////////////////////////////////
// Status — kept as a const tuple so we get both a runtime list (for
// validation / iteration) and a derived union type from one declaration.
export const INVOICE_STATUSES = [
  "draft",
  "pending",
  "paid",
  "overdue",
] as const;

/** A single invoice lifecycle state. */
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

///////////////////////////////////////////////////////////////
// Domain shape — what the rest of the app consumes (camelCase, coerced types).
/**
 * An invoice as used throughout the UI and business logic.
 */
export interface Invoice {
  /** Primary key (uuid). */
  id: string;
  /** Customer display name. */
  customer: string;
  /** Amount in major currency units (e.g. dollars, not cents). */
  amount: number;
  /** Current lifecycle status. */
  status: InvoiceStatus;
  /** Due date as an ISO date string (YYYY-MM-DD). */
  dueDate: string;
  /** Creation timestamp as an ISO string. */
  createdAt: string;
}

///////////////////////////////////////////////////////////////
// Persistence shape — exactly what `tl_invoices` returns from Supabase.
/**
 * Raw `tl_invoices` row as returned by PostgREST (snake_case columns).
 *
 * `amount` is typed as `number | string` because Postgres `numeric` can arrive
 * serialized as a string for large/precise values.
 */
export interface InvoiceRow {
  id: string;
  customer: string;
  amount: number | string;
  status: string;
  due_date: string;
  created_at: string;
}
