/**
 * @file features/create-invoice/model/new-invoice-input.ts
 * Payload shape emitted by CreateInvoiceForm on valid submit.
 *
 * Purpose: type the user-provided fields for creating an invoice (no server ids).
 * Used in: features/create-invoice/ui/create-invoice-form.tsx and its unit tests.
 * Used for: a stable contract between the form UI and callers (callbacks / later mutations).
 *
 * Steps:
 * 1. Pick customer, amount, status, and dueDate from the Invoice entity.
 * 2. Leave id and createdAt out — those are assigned by the server.
 */

import type { Invoice } from "@/entities/invoice";

///////////////////////////////////////////////////////////////
// Form payload — subset of Invoice the user fills in.

/**
 * Fields a user provides when creating an invoice.
 * `id` and `createdAt` come from the server (not part of this input).
 */
export type NewInvoiceInput = Pick<
  Invoice,
  "customer" | "amount" | "status" | "dueDate"
>;
