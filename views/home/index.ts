/**
 * @file views/home/index.ts
 * Public API of the home view.
 *
 * Purpose: expose the home composition pieces while keeping internals private.
 * Used in: app/page.tsx.
 * Used for: enforcing the "only index is public" rule from file-structure.md.
 */

export { PageCards, type PageCardsProps } from "./ui/page-cards";
export { HOME_CARDS, type HomeCard } from "./lib/home-cards";
