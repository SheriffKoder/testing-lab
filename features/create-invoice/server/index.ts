/**
 * @file features/create-invoice/server/index.ts
 * Server-only public API of the create-invoice feature.
 *
 * Purpose: expose server actions that depend on entity Supabase I/O without
 *          polluting the client-safe `@/features/create-invoice` barrel.
 * Used in: client views that import the action by reference (Next passes the
 *          action id; this module must stay server-bound).
 * Used for: the same client/server split lesson as `@/entities/invoice/server`.
 *
 * Import: `@/features/create-invoice/server` (this folder’s index — do not add a
 * sibling `server.ts`, which collides with the `server/` directory).
 *
 * Steps:
 * 1. Re-export server-only action entry points from here only.
 */

export { createInvoiceAction } from "./create-invoice-action";
