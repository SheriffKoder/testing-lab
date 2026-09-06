/**
 * @file features/create-invoice/index.ts
 * Public API of the create-invoice feature — only module outside code may import.
 *
 * Purpose: expose CreateInvoiceForm and NewInvoiceInput while keeping ui/model private.
 * Used in: tests under tests/unit/features/create-invoice/; later invoices views.
 * Used for: enforcing the "only index is public" FSD rule for this feature slice.
 *
 * Steps:
 * 1. Re-export the form component from ui/.
 * 2. Re-export the NewInvoiceInput type from model/.
 */

export { CreateInvoiceForm } from "./ui/create-invoice-form";
export type { NewInvoiceInput } from "./model/new-invoice-input";
