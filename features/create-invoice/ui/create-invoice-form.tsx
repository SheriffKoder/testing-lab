/**
 * @file features/create-invoice/ui/create-invoice-form.tsx
 * Controlled Create Invoice form — typing, validation, submit, cancel.
 *
 * Purpose: collect NewInvoiceInput via accessible fields and emit it through
 *          onSubmit; call onCancel without submitting. No Supabase / network.
 * Used in: views/invoices/ui/create-invoice-view.tsx; unit interaction tests.
 * Used for: isolating form behavior behind callback props so unit tests need
 *           no DB — callers pass jest.fn() or a real mutation later.
 *
 * Steps:
 * 1. Hold controlled string state for each field (status defaults to "draft").
 * 2. On submit: validate; if invalid, set errors with role="alert" and return.
 * 3. If valid: call onSubmit with trimmed customer, Number(amount), status, dueDate.
 * 4. Cancel button (type="button") calls onCancel without submitting the form.
 * 5. Shell matches the invoices table: rounded-xl border bg-card shadow-sm.
 */

"use client";

import { useState, type FormEvent } from "react";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/entities/invoice";
import type { NewInvoiceInput } from "../model/new-invoice-input";

///////////////////////////////////////////////////////////////
// Props — callbacks only; persistence is the caller's job (Item 7).

interface CreateInvoiceFormProps {
  /** Called with parsed field values when the form is valid. */
  onSubmit: (input: NewInvoiceInput) => void | Promise<void>;
  /** Called when the user cancels; must not submit. */
  onCancel: () => void;
}

///////////////////////////////////////////////////////////////
// Per-field error messages shown with role="alert".

interface FormErrors {
  customer?: string;
  amount?: string;
  dueDate?: string;
}

/**
 * Controlled create-invoice form with client-side validation.
 *
 * @param onSubmit - receives NewInvoiceInput when all fields are valid
 * @param onCancel - invoked by the Cancel button (type="button")
 *
 * @example
 * <CreateInvoiceForm
 *   onSubmit={(input) => console.log(input)}
 *   onCancel={() => setOpen(false)}
 * />
 */
export function CreateInvoiceForm({
  onSubmit,
  onCancel,
}: CreateInvoiceFormProps) {
  ///////////////////////////////////////////////////////////////
  // Controlled field state — strings so inputs stay uncontrolled-safe;
  // amount is parsed to number only on successful submit.
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * Validate fields, surface alerts, or emit NewInvoiceInput via onSubmit.
   * Uses a real form submit path so Enter / submit-button clicks both work.
   */
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // 1. Prevent full page reload — this is a client form.
    e.preventDefault();

    // 2. Build an errors map from visible validation rules (never call onSubmit if any fail).
    const nextErrors: FormErrors = {};
    const trimmedCustomer = customer.trim();

    if (!trimmedCustomer) {
      nextErrors.customer = "Customer is required";
    }

    const amountNumber = Number(amount);
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      nextErrors.amount = "Amount must be greater than 0";
    }

    if (!dueDate.trim()) {
      nextErrors.dueDate = "Due date is required";
    }

    // 3. Invalid → show messages near fields; do not call onSubmit.
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // 4. Valid → clear errors and emit the parsed payload (amount as number).
    setErrors({});
    void onSubmit({
      customer: trimmedCustomer,
      amount: amountNumber,
      status,
      dueDate,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm"
    >
      {/* Customer — label htmlFor ties accessible name to this input */}
      <div className="flex flex-col gap-1">
        <label htmlFor="create-invoice-customer" className="text-sm font-medium">
          Customer
        </label>
        <input
          id="create-invoice-customer"
          type="text"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          autoComplete="organization"
        />
        {errors.customer ? (
          <p role="alert" className="text-sm text-[var(--color-error)]">
            {errors.customer}
          </p>
        ) : null}
      </div>

      {/* Amount — kept as string in state; Number() only on valid submit */}
      <div className="flex flex-col gap-1">
        <label htmlFor="create-invoice-amount" className="text-sm font-medium">
          Amount
        </label>
        <input
          id="create-invoice-amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {errors.amount ? (
          <p role="alert" className="text-sm text-[var(--color-error)]">
            {errors.amount}
          </p>
        ) : null}
      </div>

      {/* Status — options from entity INVOICE_STATUSES; default draft */}
      <div className="flex flex-col gap-1">
        <label htmlFor="create-invoice-status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="create-invoice-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {INVOICE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {/* Due date — required ISO date string (YYYY-MM-DD) from type="date" */}
      <div className="flex flex-col gap-1">
        <label htmlFor="create-invoice-due-date" className="text-sm font-medium">
          Due date
        </label>
        <input
          id="create-invoice-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {errors.dueDate ? (
          <p role="alert" className="text-sm text-[var(--color-error)]">
            {errors.dueDate}
          </p>
        ) : null}
      </div>

      {/* Actions — submit is type=submit; cancel is type=button so it never submits */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Create invoice
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-input px-3 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
