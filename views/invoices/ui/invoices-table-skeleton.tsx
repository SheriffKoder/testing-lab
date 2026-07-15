/**
 * @file app/invoices/ui/invoices-table-skeleton.tsx
 * Loading placeholder shaped like the invoices table.
 *
 * Purpose: give the invoices list a stable, non-jarring loading state that
 *          matches the real table's layout.
 * Used in: app/invoices/loading.tsx (route fallback) and app/invoices/page.tsx
 *          (Suspense fallback) — one skeleton, two consumers.
 * Used for: perceived-performance while server data streams in.
 */

/** Number of placeholder rows to show while loading. */
const SKELETON_ROWS = 5;

/**
 * Render an animated, table-shaped loading placeholder.
 */
export function InvoicesTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-lg border"
      role="status"
      aria-label="Loading invoices"
    >
      {/* Header strip mirrors the real table header height. */}
      <div className="border-b bg-muted/50 px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted-foreground/20" />
      </div>

      {/* Placeholder rows. Array index is a valid key: list is static. */}
      {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between border-b px-4 py-4 last:border-0"
        >
          <div className="h-4 w-40 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted-foreground/20" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      ))}

      <span className="sr-only">Loading invoices…</span>
    </div>
  );
}
