/**
 * @file views/invoices/server.ts
 * Server-only public API of the invoices view.
 *
 * Purpose: expose async Server Components that fetch data, without mixing them
 *          into the client-safe `@/views/invoices` barrel.
 * Used in: app/invoices/page.tsx.
 * Used for: keeping Supabase / next/headers out of client routes like /invoices/new.
 */

export { InvoicesSection } from "./ui/invoices-section";
