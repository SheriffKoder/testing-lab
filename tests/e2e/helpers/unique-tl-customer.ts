/**
 * Unique customer labels for Playwright write-path tests.
 *
 * Why: browser contexts are isolated; the Supabase `tl_invoices` table is not.
 * A shared/fixed name flakes under `fullyParallel` (ambiguous row, unique clash).
 *
 * Shape: `tl_pw_<kind>_<time>_<random>` — time for readability, random so two
 * workers starting in the same millisecond still differ.
 *
 * Teardown: deferred. There is no delete invoice feature, no DELETE RLS policy,
 * and no service-role key in `.env.example`. Adding any of those just to wipe
 * `tl_pw_*` rows is new infra. Unique names are the isolation; leftover lab
 * rows are acceptable until a real delete path exists.
 *
 * Used by: tests/e2e/create-invoice.spec.ts.
 */
export function uniqueTlCustomer(kind: "create" | "error"): string {
  const stamp = Date.now();
  const nonce = Math.random().toString(36).slice(2, 8);

  return `tl_pw_${kind}_${stamp}_${nonce}`;
}
