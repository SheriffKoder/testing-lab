/**
 * @file app/invoices/ui/invoices-table.tsx
 * Presentational, Notion-style table that renders a list of invoices.
 *
 * Purpose: pure, dumb component — receives invoices and renders a semantic
 *          table (or an empty state). No data fetching, no side effects.
 * Used in: app/invoices/ui/invoices-section.tsx.
 * Used for: displaying invoices in Phase 0 (verification: invoices appear).
 */

import { cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/entities/invoice";

///////////////////////////////////////////////////////////////
// Presentation maps + formatters (module scope: built once, reused per render).

/**
 * Soft "pill" colours per status, Notion-style (tinted bg + coloured text).
 * Uses the theme tokens from globals.css so it adapts to light/dark.
 */
const STATUS_PILL: Record<InvoiceStatus, string> = {
  paid: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  pending: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  overdue: "bg-[var(--color-error-light)] text-[var(--color-error)]",
  draft: "bg-muted text-muted-foreground",
};

/**
 * Currency + date formatters.
 *
 * NOTE: Phase 1 (Item 3) extracts these into tested `utils/` helpers
 * (`formatCurrency`, etc.); kept inline here to avoid pre-building that step.
 */
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** Shared header cell classes: small, muted, uppercase — Notion column look. */
const TH_CLASS =
  "px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground";

///////////////////////////////////////////////////////////////
// Small pure helpers.

/**
 * First character of a customer name, uppercased, for the avatar chip.
 *
 * @param customer - customer display name
 * @returns a single uppercase initial (or "?" when empty)
 */
function initial(customer: string): string {
  return customer.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Props for {@link InvoicesTable}.
 */
export interface InvoicesTableProps {
  /** Invoices to render; an empty array renders the empty state. */
  invoices: Invoice[];
}

/**
 * Render invoices as an accessible, Notion-style table, or an empty state.
 *
 * @param props - see {@link InvoicesTableProps}
 */
export function InvoicesTable({ invoices }: InvoicesTableProps) {
  // Empty state: keep it a distinct, obvious branch (tested in Phase 1).
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-12 text-center">
        <p className="text-sm font-medium text-foreground">No invoices yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Seed the tl_invoices table to see data here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">List of invoices</caption>
          <thead>
            <tr className="border-b border-border/70 text-left">
              <th scope="col" className={TH_CLASS}>
                Customer
              </th>
              <th scope="col" className={TH_CLASS}>
                Status
              </th>
              <th scope="col" className={cn(TH_CLASS, "text-right")}>
                Amount
              </th>
              <th scope="col" className={TH_CLASS}>
                Due date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {/* key: stable invoice id so React can diff rows correctly. */}
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  {/* Customer: initial chip + name, Notion database row feel. */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground"
                      aria-hidden="true"
                    >
                      {initial(invoice.customer)}
                    </span>
                    <span className="font-medium text-foreground">
                      {invoice.customer}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {/* Soft status pill with a leading dot. */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      STATUS_PILL[invoice.status],
                    )}
                  >
                    <span
                      className="size-1.5 rounded-full bg-current opacity-80"
                      aria-hidden="true"
                    />
                    {invoice.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                  {currencyFormatter.format(invoice.amount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {dateFormatter.format(new Date(invoice.dueDate))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
