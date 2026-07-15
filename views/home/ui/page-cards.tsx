/**
 * @file views/home/ui/page-cards.tsx
 * Renders the home landing navigation cards from config.
 *
 * Purpose: pure, dumb presentation — maps HOME_CARDS to link cards. No data
 *          fetching or state.
 * Used in: app/page.tsx.
 * Used for: the entry-point cards on the home page (Phase 0: link to invoices).
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOME_CARDS, type HomeCard } from "../lib/home-cards";

/**
 * Render a single card as a full-area link.
 *
 * @param props.card - the card definition to render
 */
function HomeCardLink({ card }: { card: HomeCard }) {
  // Alias to a capitalized identifier so JSX treats it as a component.
  const Icon = card.icon;

  return (
    <Link
      href={card.href}
      className="group flex items-center gap-4 rounded-lg border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Leading icon chip. */}
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 text-left">
        <h2 className="text-base font-medium">{card.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
      </div>

      {/* Arrow affordance nudges right on hover; decorative for a11y. */}
      <ArrowRight
        className="ml-auto size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Props for {@link PageCards}.
 */
export interface PageCardsProps {
  /** Extra classes for the wrapping section (e.g. spacing from the caller). */
  className?: string;
}

/**
 * Render all home landing cards from {@link HOME_CARDS}.
 *
 * @param props - see {@link PageCardsProps}
 */
export function PageCards({ className }: PageCardsProps) {
  return (
    <section className={cn("grid gap-3", className)}>
      {/* key: stable card id so React can diff the list. */}
      {HOME_CARDS.map((card) => (
        <HomeCardLink key={card.id} card={card} />
      ))}
    </section>
  );
}
