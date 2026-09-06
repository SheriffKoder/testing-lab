/**
 * @file tests/unit/features/create-invoice/ui/create-invoice-form.test.tsx
 * Interaction tests for CreateInvoiceForm — typing, submit, validation, cancel.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: locking real user flows (type / click / select) via userEvent —
 * never calling onSubmit directly. No snapshots.
 *
 * userEvent + RTL syntax used here:
 * - userEvent.setup()   — create a user instance (call BEFORE render)
 * - user.type()         — type character-by-character (async → await)
 * - user.selectOptions() — choose an <option> in a <select>
 * - user.click()        — realistic click (pointer/mouse/focus events)
 * - jest.fn()           — mock function for onSubmit / onCancel props
 * - getByLabelText()    — find a field by its associated <label>
 * - getByRole("button", { name }) — find a button by accessible name
 * - toHaveValue()       — jest-dom matcher for input/select current value
 * - toHaveBeenCalledTimes / toHaveBeenCalledWith — assert mock calls + payload
 * - not.toHaveBeenCalled() — assert handler stayed idle on invalid submit
 * - getByText() / toBeInTheDocument() — assert visible validation errors
 * - user.tab() / user.keyboard("{Enter}") — keyboard-level focus + submit
 * - toHaveFocus() — jest-dom matcher for the focused element
 * NOTE: fireEvent (raw single event) exists but we prefer userEvent (realistic).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateInvoiceForm } from "@/features/create-invoice";
import { validInvoiceInput } from "@/tests/fixtures/invoices";

// describe() — groups related cases; nested describe = behavior slice.
describe("CreateInvoiceForm", () => {
  describe("typing", () => {
    it("reflects typed text in the Customer field", async () => {
      // userEvent.setup() — create the user FIRST, before rendering.
      const user = userEvent.setup();

      render(
        <CreateInvoiceForm onSubmit={jest.fn()} onCancel={jest.fn()} />,
      );

      // getByLabelText() — query fields the way a user/screen-reader identifies them.
      const customer = screen.getByLabelText("Customer");

      // user.type() — async; fires a full keystroke sequence per character.
      await user.type(customer, "Acme Corp");

      // toHaveValue() — jest-dom matcher for the controlled input's value.
      expect(customer).toHaveValue("Acme Corp");
    });

    it("updates the Amount number field when typed", async () => {
      const user = userEvent.setup();

      render(
        <CreateInvoiceForm onSubmit={jest.fn()} onCancel={jest.fn()} />,
      );

      const amount = screen.getByLabelText("Amount");
      await user.type(amount, "1200");

      // type="number" → toHaveValue expects a number, not the string "1200".
      expect(amount).toHaveValue(1200);
    });

    it("changes Status when an option is selected", async () => {
      const user = userEvent.setup();

      render(
        <CreateInvoiceForm onSubmit={jest.fn()} onCancel={jest.fn()} />,
      );

      const status = screen.getByLabelText("Status");

      // user.selectOptions() — pick an <option> by value (realistic change + input).
      await user.selectOptions(status, "paid");

      expect(status).toHaveValue("paid");
    });
  });

  describe("valid submit", () => {
    it("calls onSubmit once with the parsed payload when the form is valid", async () => {
      const user = userEvent.setup();
      // jest.fn() — mock we assert against; never call onSubmit() ourselves.
      const onSubmit = jest.fn();

      render(
        <CreateInvoiceForm onSubmit={onSubmit} onCancel={jest.fn()} />,
      );

      // Fill every field the way a user would (fixture values).
      await user.type(
        screen.getByLabelText("Customer"),
        validInvoiceInput.customer,
      );
      await user.type(
        screen.getByLabelText("Amount"),
        String(validInvoiceInput.amount),
      );
      await user.selectOptions(
        screen.getByLabelText("Status"),
        validInvoiceInput.status,
      );
      await user.type(
        screen.getByLabelText("Due date"),
        validInvoiceInput.dueDate,
      );

      // user.click() — submit via the real button (not invoking the handler).
      await user.click(
        screen.getByRole("button", { name: "Create invoice" }),
      );

      // toHaveBeenCalledTimes(1) — exactly one successful submit.
      expect(onSubmit).toHaveBeenCalledTimes(1);

      // toHaveBeenCalledWith — amount must be a number (form parsed the string).
      expect(onSubmit).toHaveBeenCalledWith({
        customer: validInvoiceInput.customer,
        amount: 1200,
        status: validInvoiceInput.status,
        dueDate: validInvoiceInput.dueDate,
      });
    });
  });

  describe("validation", () => {
    it("shows Customer is required and does not submit when the form is empty", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(
        <CreateInvoiceForm onSubmit={onSubmit} onCancel={jest.fn()} />,
      );

      // Submit with no fields filled — validation must surface visible errors.
      await user.click(
        screen.getByRole("button", { name: "Create invoice" }),
      );

      // Assert visible error text (role="alert"), never an internal errors object.
      expect(screen.getByText("Customer is required")).toBeInTheDocument();

      // not.toHaveBeenCalled() — invalid submit must not emit a payload.
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rejects amount 0 with a visible error and does not call onSubmit", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(
        <CreateInvoiceForm onSubmit={onSubmit} onCancel={jest.fn()} />,
      );

      // Fill other required fields so the failure under test is amount ≤ 0.
      await user.type(screen.getByLabelText("Customer"), "Acme Corp");
      await user.type(screen.getByLabelText("Amount"), "0");
      await user.type(screen.getByLabelText("Due date"), "2026-08-15");

      await user.click(
        screen.getByRole("button", { name: "Create invoice" }),
      );

      expect(
        screen.getByText("Amount must be greater than 0"),
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("calls onCancel once and does not call onSubmit", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const onCancel = jest.fn();

      render(
        <CreateInvoiceForm onSubmit={onSubmit} onCancel={onCancel} />,
      );

      // Cancel is type="button" — click must not submit the form.
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("keyboard", () => {
    it("moves focus to Customer on the first Tab", async () => {
      const user = userEvent.setup();

      render(
        <CreateInvoiceForm onSubmit={jest.fn()} onCancel={jest.fn()} />,
      );

      // user.tab() — advance focus like pressing Tab (first field in tab order).
      await user.tab();

      // toHaveFocus() — jest-dom matcher for the active element.
      expect(screen.getByLabelText("Customer")).toHaveFocus();
    });

    it("submits a valid form when Enter is pressed in a field", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(
        <CreateInvoiceForm onSubmit={onSubmit} onCancel={jest.fn()} />,
      );

      await user.type(
        screen.getByLabelText("Customer"),
        validInvoiceInput.customer,
      );
      await user.type(
        screen.getByLabelText("Amount"),
        String(validInvoiceInput.amount),
      );
      await user.selectOptions(
        screen.getByLabelText("Status"),
        validInvoiceInput.status,
      );
      await user.type(
        screen.getByLabelText("Due date"),
        validInvoiceInput.dueDate,
      );

      // Focus a text field, then Enter — native <form> submit without clicking.
      await user.click(screen.getByLabelText("Customer"));
      // user.keyboard("{Enter}") — low-level key input; {Enter} is the Enter key.
      await user.keyboard("{Enter}");

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        customer: validInvoiceInput.customer,
        amount: 1200,
        status: validInvoiceInput.status,
        dueDate: validInvoiceInput.dueDate,
      });
    });
  });
});
