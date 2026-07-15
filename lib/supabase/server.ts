/**
 * @file lib/supabase/server.ts
 * Request-scoped Supabase client for Server Components, Route Handlers and
 * Server Actions.
 *
 * Purpose: build a Supabase client that reads/writes the auth session through
 *          Next.js request cookies, so server code talks to the DB as the
 *          current user (or the public/anon role when signed out).
 * Used in: entities/<entity>/queries/*, entities/<entity>/mutations/* and any
 *          server-side data access (Phase 0: reading tl_invoices).
 * Used for: the single source of truth for creating a server Supabase client.
 *
 * Steps:
 * 1. Read the request cookie store (async in Next 16).
 * 2. Create a server client bound to that cookie store.
 * 3. Return the client so callers can run queries/mutations.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a Supabase client bound to the current request's cookies.
 *
 * Call this per request — never cache the result at module scope, because it
 * captures request-scoped cookies and would otherwise leak sessions between
 * users.
 *
 * @returns a Supabase client authenticated via the current request session
 * @throws Error when the public Supabase env vars are missing
 */
export async function createClient() {
  ///////////////////////////////////////////////////////////////
  // 1. Grab the request cookie store (Next 16 makes cookies() async).
  const cookieStore = await cookies();

  // 2. Fail fast with a readable message if env is not configured.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env",
    );
  }

  // 3. Build a server client that syncs auth tokens with the request cookies.
  return createServerClient(url, key, {
    cookies: {
      // Read every cookie so Supabase can restore an existing session.
      getAll() {
        return cookieStore.getAll();
      },
      // Persist refreshed tokens. In a Server Component render the cookie store
      // is read-only, so we swallow that error — session refresh belongs in
      // middleware once auth is introduced in a later phase.
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — safe to ignore.
        }
      },
    },
  });
}
