/**
 * @file entities/invoice/lib/format-invoice-status.ts
 * Pure display helper: invoice status string → human-readable label.
 *
 * Used in: views that show invoice status (e.g. InvoicesTable).
 * Used for: one place owning status labels + safe fallback for unknown values
 * (aligned with toInvoiceStatus falling back to "draft").
 *
 * Steps:
 * 1. Map each known InvoiceStatus to its title-case label.
 * 2. If the input is in INVOICE_STATUSES, return that label.
 * 3. Otherwise return the Draft label (safe UI fallback).
 */

import {
  INVOICE_STATUSES,
  type InvoiceStatus,
} from "../model/invoice";

/////////////////////////////////////////////////////////////
// Display labels — kept next to the formatter so UI copy stays with the rule.
const LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
};

/**
 * Format an invoice status for display.
 *
 * Known statuses become title-case labels (`"paid"` → `"Paid"`). Unknown or
 * empty strings fall back to `"Draft"` so the UI never shows a raw junk value.
 *
 * @param status - status string (usually a domain InvoiceStatus; may be unknown)
 * @returns a human-readable label such as `"Paid"` or `"Draft"`
 *
 * @example
 * formatInvoiceStatus("paid")     // "Paid"
 * formatInvoiceStatus("unknown")  // "Draft"
 */
export function formatInvoiceStatus(status: string): string {
  // 1. Membership check against the shared status tuple (same pattern as toInvoiceStatus).
  const isKnown = (INVOICE_STATUSES as readonly string[]).includes(status);

  // 2. Known → mapped label; unknown/empty → Draft.
  return isKnown ? LABELS[status as InvoiceStatus] : LABELS.draft;
}
