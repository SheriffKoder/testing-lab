/**
 * @file app/not-found.tsx
 * App-wide custom 404 page.
 *
 * Purpose: replace the default Next.js 404 with a branded, navigable page.
 * Used in: rendered by Next for unmatched routes and manual `notFound()` calls.
 * Used for: keeping unknown URLs on-brand with a route back to safety.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Render the global 404 view.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/invoices">Go to invoices</Link>
      </Button>
    </main>
  );
}
