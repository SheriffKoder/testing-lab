/**
 * @file shared/lib/index.ts
 * Public barrel for shared pure helpers — cross-domain, no business rules.
 *
 * Used in: views/features that need generic formatting utilities.
 * Used for: stable import path `@/shared/lib` instead of deep file imports.
 *
 * Function index:
 * - formatCurrency (format-currency)
 */

export { formatCurrency } from "./format-currency";
