# view: home

Composition for the `/` landing page.

## Layers

| Folder     | Responsibility                                                    |
| ---------- | ---------------------------------------------------------------- |
| `lib/`     | `home-cards.ts` — the landing cards as data (`HOME_CARDS`).       |
| `ui/`      | `page-cards.tsx` — dumb renderer that maps the config to links.   |
| `index.ts` | Public API — the only module `app/` should import.               |

## Add a landing card

Append an entry to `HOME_CARDS` in `lib/home-cards.ts` (title, description,
`href`, icon). The UI updates automatically — no changes needed in `ui/`.

```ts
import { PageCards } from "@/views/home";
```
