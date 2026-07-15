"use client";

/**
 * @file app/invoices/error.tsx
 * Error boundary for the /invoices route segment.
 *
 * Purpose: catch render/data errors from the invoices section (e.g. a failed
 *          Supabase query) and offer the user a retry instead of a crash.
 * Used in: route /invoices (framework convention — must be a Client Component).
 * Used for: graceful failure of the server data fetch.
 *
 * Steps:
 * 1. Log the error in development for debugging.
 * 2. Render a message + a retry button that re-runs the segment.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Props injected by Next.js into a route `error.tsx`.
 */
interface InvoicesErrorProps {
  /** The thrown error (message is scrubbed in production). */
  error: Error & { digest?: string };
  /** Re-attempts rendering the segment. */
  reset: () => void;
}

/**
 * Render a recoverable error state for the invoices route.
 *
 * @param props - see {@link InvoicesErrorProps}
 */
export default function InvoicesError({ error, reset }: InvoicesErrorProps) {
  // 1. Surface the error while developing; stays out of the way in production.
  useEffect(
    function logInvoicesError() {
      if (process.env.NODE_ENV === "development") {
        console.error("[invoices] failed to render:", error);
      }
    },
    [error],
  );

  // 2. Minimal, accessible recovery UI.
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div
        role="alert"
        className="rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center"
      >
        <h1 className="text-lg font-semibold">Couldn&apos;t load invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Something went wrong while fetching data from Supabase.
        </p>
        <Button onClick={reset} variant="outline" className="mt-4">
          Try again
        </Button>
      </div>
    </main>
  );
}
