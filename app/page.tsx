/**
 * @file app/page.tsx
 * Landing page — introduces the app and routes into its sections.
 *
 * Purpose: a left-aligned header plus the home navigation cards.
 * Used in: route / (home).
 * Used for: giving the app a real entry point instead of a placeholder.
 */

import { ThemeSwitcher } from "@/components/theme-switcher";
import { PageCards } from "@/views/home";

/**
 * Render the home landing page.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      {/* Top bar: keep the theme control reachable in the corner. */}
      <div className="flex justify-end">
        <ThemeSwitcher />
      </div>

      {/* Left-aligned page header. */}
      <header className="mt-8 text-left">
        <h1 className="text-3xl font-semibold tracking-tight">Testing Lab</h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          A small, production-style invoice manager for practicing how real
          engineering practices—testing, CI, and performance—get introduced into
          an existing codebase.
        </p>
      </header>

      {/* Navigation cards, driven by views/home/lib/home-cards.ts. */}
      <PageCards className="mt-8" />
    </main>
  );
}
