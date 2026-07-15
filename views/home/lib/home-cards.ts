/**
 * @file views/home/lib/home-cards.ts
 * Config for the cards shown on the home landing page.
 *
 * Purpose: keep the list of landing cards as data, so the UI stays a dumb
 *          renderer and new destinations are added by editing this array only.
 * Used in: views/home/ui/page-cards.tsx.
 * Used for: driving the home navigation cards from a single source of truth.
 */

import { FileText, type LucideIcon } from "lucide-react";

/**
 * A single navigation card on the home page.
 */
export interface HomeCard {
  /** Stable key for React lists. */
  id: string;
  /** Card title / accessible link name. */
  title: string;
  /** One–two sentence explanation of the destination. */
  description: string;
  /** Route the card links to. */
  href: string;
  /** Leading icon (a lucide component). */
  icon: LucideIcon;
}

/**
 * Ordered list of landing cards. Add a new entry to surface another section.
 */
export const HOME_CARDS: HomeCard[] = [
  {
    id: "invoices",
    title: "Invoices",
    description:
      "Browse invoices served from Supabase. Creating, editing, and deleting arrive in later phases — everything renders on the server first.",
    href: "/invoices",
    icon: FileText,
  },
];
