# entity: invoice

Domain concept for the app: an invoice belonging to a customer.

Backed by the Supabase table `tl_invoices`.

## Layers

| Folder       | Responsibility                                              |
| ------------ | ----------------------------------------------------------- |
| `model/`     | Domain types (`Invoice`, `InvoiceStatus`) + the raw `InvoiceRow` shape. |
| `transform/` | Pure mapping from a raw DB row to the domain `Invoice`.      |
| `queries/`   | Server read use-cases (currently `listInvoices`).           |
| `index.ts`   | Public API — the only module other slices may import.       |

## Import rule

Import from the entity root only:

```ts
import { listInvoices, type Invoice } from "@/entities/invoice";
```

Never reach into internal files (e.g. `entities/invoice/queries/list-invoices`)
from outside the entity.

## Data shape

Domain (`Invoice`) is camelCase; the DB (`tl_invoices`) is snake_case. The
`transform/` layer is the single boundary that converts one into the other, so
column naming never leaks into the UI.

## Not here yet

Writes (create / edit / delete), validation schemas, and client fetchers arrive
in later phases as `mutations/`, `schema/`, and `client/` — added only when a
feature actually needs them.
