/**
 * @file tests/unit/app/invoices/error.test.tsx
 * Unit tests for the /invoices route error.tsx — alert UI + retry action.
 *
 * Used by: `npm test` (discovered under tests/unit/).
 * Used for: locking the recoverable error contract without running the full
 * Next.js router / error-boundary lifecycle.
 *
 * Jest + RTL + userEvent syntax used here:
 * - jest.fn() — mock `reset` so we can assert the retry callback
 * - userEvent.setup() — create a user instance BEFORE render
 * - user.click() — realistic click sequence (async → await)
 * - getByRole("alert") — accessible error region
 * - getByRole("heading" | "button", { name }) — by role + accessible name
 * - toHaveBeenCalledTimes(1) — assert mock call count after the click
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoicesError from "@/app/invoices/error";

describe("InvoicesError (app/invoices/error.tsx)", () => {
  it("shows an accessible error state and retries via reset", async () => {
    // userEvent.setup() — create the user BEFORE render (shared pointer state).
    const user = userEvent.setup();
    // jest.fn() — stand-in for Next's reset(); records calls for assertions.
    const reset = jest.fn();

    render(
      <InvoicesError
        error={new Error("Database unavailable")}
        reset={reset}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Couldn't load invoices" }),
    ).toBeInTheDocument();

    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toBeInTheDocument();

    // user.click() — fires the full pointer/mouse/focus sequence, then awaits.
    await user.click(retry);

    // toHaveBeenCalledTimes(1) — reset must run exactly once per click.
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
