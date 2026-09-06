/**
 * @file app/invoices/new/page.tsx
 * Create-invoice route — thin shell for /invoices/new.
 *
 * Purpose: render the create-invoice view; no form logic here.
 * Used in: route /invoices/new.
 * Used for: a dedicated page for CreateInvoiceForm (linked from the list header).
 */

import { CreateInvoiceView } from "@/views/invoices";

/** Static route metadata. */
export const metadata = {
  title: "Create invoice",
};

/**
 * Render the create-invoice page shell.
 */
export default function CreateInvoicePage() {
  return <CreateInvoiceView />;
}
