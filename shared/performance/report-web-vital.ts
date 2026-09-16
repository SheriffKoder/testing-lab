/**
 * @file shared/performance/report-web-vital.ts
 * Pure reporter for Core Web Vitals payloads (no React).
 *
 * Purpose: turn a Next/web-vitals metric into a small telemetry event — console
 *          in the lab, optional sendBeacon when an endpoint is configured.
 * Used in: shared/performance/web-vitals-reporter.tsx.
 * Used for: Item 7 lightweight RUM bridge without an analytics platform.
 *
 * Steps:
 * 1. Ignore non-CWV names (keep LCP / INP / CLS only).
 * 2. Build a serializable payload (metric + route + device + release).
 * 3. Log outside production; in all envs beacon if endpoint is set.
 */

/** Subset of Next `useReportWebVitals` metric fields we care about. */
export interface WebVitalMetric {
  name: string;
  value: number;
  id: string;
  rating?: string;
}

/** Coarse device hints for field slicing — not a full fingerprint. */
export interface WebVitalDevice {
  /** Rough form factor: mobile | tablet | desktop | unknown */
  formFactor: "mobile" | "tablet" | "desktop" | "unknown";
  /** Browser-reported hardware concurrency when available. */
  hardwareConcurrency: number | undefined;
  /** Truncated UA string for lab debugging (not for identity). */
  userAgent: string | undefined;
}

/** Lab / production event shape documented in Item 7 strategy. */
export interface WebVitalPayload {
  name: string;
  value: number;
  id: string;
  rating?: string;
  route: string;
  device: WebVitalDevice;
  /** App/release version from `NEXT_PUBLIC_APP_VERSION`, else `"local"`. */
  release: string;
}

const CORE_WEB_VITALS = new Set(["LCP", "INP", "CLS"]);

/**
 * Coarse form factor from viewport + touch — good enough for RUM slices.
 */
export function detectFormFactor(
  width: number | undefined,
  maxTouchPoints: number | undefined,
): WebVitalDevice["formFactor"] {
  if (width === undefined) {
    return "unknown";
  }
  const touch = (maxTouchPoints ?? 0) > 0;
  if (width < 768) {
    return "mobile";
  }
  if (width < 1024 && touch) {
    return "tablet";
  }
  return "desktop";
}

/**
 * Read coarse device info from the browser (safe no-ops on the server).
 */
export function readDeviceInfo(
  nav: Pick<
    Navigator,
    "userAgent" | "hardwareConcurrency" | "maxTouchPoints"
  > | undefined = typeof navigator !== "undefined" ? navigator : undefined,
  width: number | undefined = typeof window !== "undefined"
    ? window.innerWidth
    : undefined,
): WebVitalDevice {
  return {
    formFactor: detectFormFactor(width, nav?.maxTouchPoints),
    hardwareConcurrency: nav?.hardwareConcurrency,
    userAgent: nav?.userAgent ? nav.userAgent.slice(0, 120) : undefined,
  };
}

/**
 * Resolve release/version for payloads.
 */
export function resolveRelease(
  envVersion: string | undefined = process.env.NEXT_PUBLIC_APP_VERSION,
): string {
  return envVersion?.trim() || "local";
}

/**
 * Build the telemetry payload for one metric.
 */
export function buildWebVitalPayload(
  metric: WebVitalMetric,
  route: string,
  device: WebVitalDevice = readDeviceInfo(),
  release: string = resolveRelease(),
): WebVitalPayload {
  return {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating,
    route,
    device,
    release,
  };
}

/**
 * Report one Web Vital: filter to LCP/INP/CLS, log outside production,
 * optionally beacon to `NEXT_PUBLIC_WEB_VITALS_ENDPOINT`.
 *
 * @param metric - metric from `useReportWebVitals`
 * @param route - pathname at report time (e.g. `/invoices`)
 */
export function reportWebVital(
  metric: WebVitalMetric,
  route: string = typeof window !== "undefined" ? window.location.pathname : "/",
): void {
  // 1. Core Web Vitals only — drop FCP/TTFB/Next.js-* noise for this lab.
  if (!CORE_WEB_VITALS.has(metric.name)) {
    return;
  }

  // 2. Stable event shape: LCP/INP/CLS + route + device + release.
  const payload = buildWebVitalPayload(metric, route);

  // 3a. Lab visibility — log outside production (dev + Jest).
  if (process.env.NODE_ENV !== "production") {
    console.info("[web-vitals]", payload);
  }

  // 3b. Production contract — only send when an endpoint is configured.
  const endpoint = process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT;
  if (!endpoint || typeof navigator === "undefined") {
    return;
  }

  const body = JSON.stringify(payload);
  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(endpoint, body);
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    body,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  });
}
