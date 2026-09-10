/**
 * @file tests/unit/views/invoices/ui/create-invoice-view.test.tsx
 * Wiring tests for CreateInvoiceView — real form UI, mocked persistence + router.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: proving submit calls the server action offline and navigates (or
 * shows an alert) without contacting Supabase.
 *
 * Mocking + interaction syntax used here:
 * - jest.mock("@/features/create-invoice/server") — fake createInvoiceAction
 *   (write boundary); form + view stay real
 * - jest.mock("next/navigation") — fake useRouter push / refresh
 * - jest.mocked / mockResolvedValue / mockRejectedValue / mockReset
 * - userEvent.setup / type / selectOptions / click — drive the real form
 * - waitFor — assert after the async action settles (form awaits onSubmit)
 *
 * Stays real: CreateInvoiceForm validation UI and CreateInvoiceView error alert.
 * Not mocked: formatters, toInvoice, Supabase (action is the cut point here).
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/features/create-invoice/server";
import { CreateInvoiceView } from "@/views/invoices/ui/create-invoice-view";
import {
  createdInvoice,
  validInvoiceInput,
} from "@/tests/fixtures/invoices";

// Variables must be named `mock*` so Jest’s hoist-safe mock factory can close over them.
const mockPush = jest.fn();
const mockRefresh = jest.fn();

// jest.mock("next/navigation") — replace useRouter; no real App Router in jsdom.
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// jest.mock — replace the server action so submit never hits createInvoice / Supabase.
jest.mock("@/features/create-invoice/server", () => ({
  createInvoiceAction: jest.fn(),
}));

const mockedCreateInvoiceAction = jest.mocked(createInvoiceAction);
const mockedUseRouter = jest.mocked(useRouter);

/** Fill CreateInvoiceForm fields from the shared valid fixture. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
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
}

describe("CreateInvoiceView", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockedCreateInvoiceAction.mockReset();

    // mockReturnValue — each test gets a fresh router with the shared fn spies.
    mockedUseRouter.mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("calls the action and navigates home on successful submit", async () => {
    const user = userEvent.setup();
    // mockResolvedValue — fulfilled action result; no real DB insert.
    mockedCreateInvoiceAction.mockResolvedValue(createdInvoice);

    render(<CreateInvoiceView />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create invoice" }));

    // waitFor — form awaits onSubmit; click may finish before the action
    // Promise settles; retry until navigation assertions pass.
    await waitFor(() => {
      expect(mockedCreateInvoiceAction).toHaveBeenCalledTimes(1);
    });
    expect(mockedCreateInvoiceAction).toHaveBeenCalledWith(validInvoiceInput);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/invoices");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert and does not navigate when the action rejects", async () => {
    const user = userEvent.setup();
    // mockRejectedValue — failure path without a network call.
    mockedCreateInvoiceAction.mockRejectedValue(
      new Error("Failed to create invoice: database unavailable"),
    );

    render(<CreateInvoiceView />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create invoice" }));

    // findByRole — async wait for the view’s role="alert" after the catch.
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Failed to create invoice: database unavailable");

    expect(mockedCreateInvoiceAction).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
