/**
 * @file app/invoices/layout.tsx
 * Invoices segment layout — hosts the Item 8 intentional LHCI regression.
 *
 * Purpose: load a large synchronous script on /invoices only so Lighthouse CI
 *          can catch a script-size / blocking regression (temporary drill).
 * Used in: route /invoices and children.
 *
 * TEMP: remove this layout (or the script) after the regression exercise is
 * documented and CI is green again. See docs/performance/4-8-performance-ci.md.
 */

/**
 * Wrap invoices routes; inject the temporary blocking regression script.
 */
export default function InvoicesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/*
        Item 8 regression drill: classic blocking <script> (no async/defer).
        ~450 kB public asset → trips resource-summary:script:size error budget.
      */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- intentional Item 8 LHCI regression */}
      <script src="/item-8-regression-blocking.js" />
      {children}
    </>
  );
}
