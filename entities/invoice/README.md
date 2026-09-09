# entity: invoice

Domain concept for the app: an invoice belonging to a customer.

Backed by the Supabase table `tl_invoices`.

## Layers

| Folder / file | Responsibility |
| ------------- | -------------- |
| `model/` | Domain types (`Invoice`, `InvoiceStatus`) + the raw `InvoiceRow` shape. |
| `transform/` | Pure mapping from a raw DB row to the domain `Invoice`. |
| `queries/` | Server read use-cases (`listInvoices`). |
| `mutations/` | Server write use-cases (`createInvoice`). |
| `index.ts` | Client-safe public API — types and pure helpers only. |
| `server.ts` | Server-only public API — query/mutation use-cases. |

## Import rule

**Client-safe** (types, status list, pure helpers) — import from the entity root:

```ts
import { type Invoice, INVOICE_STATUSES, toInvoice } from "@/entities/invoice";
```

**Server-only** (Supabase I/O via `next/headers`) — import from the server barrel:

```ts
import { listInvoices, createInvoice } from "@/entities/invoice/server";
import type { CreateInvoiceInput } from "@/entities/invoice/server";
```

Never deep-import internal files (e.g. `entities/invoice/queries/list-invoices` or
`entities/invoice/mutations/create-invoice`) from outside the entity. Never import
`@/entities/invoice/server` from Client Components — it pulls in `next/headers`.

## Data shape

Domain (`Invoice`) is camelCase; the DB (`tl_invoices`) is snake_case. The
`transform/` layer is the single boundary that converts one into the other, so
column naming never leaks into the UI. Mutations write snake_case columns and map
the returned row through `toInvoice`.

## Not here yet

Edit / delete mutations, validation schemas, and client fetchers arrive later as
more `mutations/`, `schema/`, and `client/` — added only when a feature needs them.
