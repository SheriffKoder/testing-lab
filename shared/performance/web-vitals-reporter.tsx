/**
 * @file shared/performance/web-vitals-reporter.tsx
 * Tiny client island that subscribes to Next.js Web Vitals.
 *
 * Purpose: keep `"use client"` at a leaf so root layout stays a Server Component.
 * Used in: app/layout.tsx.
 * Used for: Item 7 lightweight LCP / INP / CLS reporting.
 *
 * Steps:
 * 1. Register a stable `useReportWebVitals` callback (module-scope handler).
 * 2. Forward each metric to {@link reportWebVital}.
 * 3. Render nothing.
 */

"use client";

import { useReportWebVitals } from "next/web-vitals";
import { reportWebVital } from "./report-web-vital";

/**
 * Stable callback — Next re-invokes with prior metrics if the function identity
 * changes, which would duplicate reports.
 */
function handleWebVital(metric: {
  name: string;
  value: number;
  id: string;
  rating?: string;
}) {
  reportWebVital(metric);
}

/**
 * Mount once in the root layout; renders no UI.
 */
export function WebVitalsReporter() {
  useReportWebVitals(handleWebVital);
  return null;
}
