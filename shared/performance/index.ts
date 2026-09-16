/**
 * @file shared/performance/index.ts
 * Public surface for shared Web Vitals reporting.
 *
 * Used in: app/layout.tsx (reporter); tests for the pure reporter.
 */

export { WebVitalsReporter } from "./web-vitals-reporter";
export {
  buildWebVitalPayload,
  detectFormFactor,
  readDeviceInfo,
  reportWebVital,
  resolveRelease,
  type WebVitalDevice,
  type WebVitalMetric,
  type WebVitalPayload,
} from "./report-web-vital";
