/**
 * @file shared/lib/format-currency.ts
 * Pure USD currency formatter for display across the app (no domain rules).
 *
 * Used in: views that show money amounts (e.g. invoices table).
 * Used for: deterministic en-US USD strings so UI and unit tests share one contract.
 *
 * Steps:
 * 1. Build an Intl.NumberFormat with fixed locale + currency.
 * 2. Format the given amount and return the localized string.
 */

/**
 * Format a number as USD currency (en-US), e.g. 1200 → "$1,200.00".
 *
 * Locale and currency are fixed inside the helper so results stay deterministic
 * across machines and CI (not dependent on the runner's default locale).
 *
 * @param amount - numeric amount in dollars (may include cents or be negative)
 * @returns currency string such as `"$1,200.00"`
 *
 * @example
 * formatCurrency(1200) // "$1,200.00"
 * formatCurrency(0)    // "$0.00"
 */
export function formatCurrency(amount: number): string {
  // 1. Fixed en-US + USD — same options the invoices table used inline before extraction.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
