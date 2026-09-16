/**
 * @file lib/supabase/public-server.ts
 * Cookie-free Supabase client for cached server reads.
 *
 * Purpose: create an anon/public Supabase client that does not call
 *          `next/headers` `cookies()`, so it is safe inside `unstable_cache`.
 * Used in: entities/invoice/queries/list-invoices.ts (and similar public lists).
 * Used for: cross-request Data Cache of public table reads (e.g. tl_invoices).
 *
 * Steps:
 * 1. Read public Supabase env vars.
 * 2. Build a plain `@supabase/supabase-js` client (no cookie session).
 * 3. Return it for one-shot query use inside a cached function.
 *
 * Note: do not use this for user-scoped or cookie-auth reads. Prefer
 * `lib/supabase/server.ts` when the query must run as the current session.
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Build a public (anon-key) Supabase client with no request cookies.
 *
 * Safe to call inside `unstable_cache` / `"use cache"` scopes.
 *
 * @returns a Supabase client using the publishable anon key
 * @throws Error when the public Supabase env vars are missing
 */
export function createPublicServerClient() {
  ///////////////////////////////////////////////////////////////
  // 1. Fail fast if env is not configured.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env",
    );
  }

  // 2. Plain JS client — no cookies() / next/headers.
  return createClient(url, key);
}
