/**
 * @file tests/unit/shared/performance/report-web-vital.test.ts
 * Unit tests for the pure Web Vitals reporter (filter, payload, device, beacon).
 */

import {
  buildWebVitalPayload,
  detectFormFactor,
  reportWebVital,
  resolveRelease,
  type WebVitalDevice,
} from "@/shared/performance/report-web-vital";

const labDevice: WebVitalDevice = {
  formFactor: "desktop",
  hardwareConcurrency: 8,
  userAgent: "Jest",
};

describe("detectFormFactor", () => {
  it("classifies narrow viewports as mobile", () => {
    expect(detectFormFactor(390, 5)).toBe("mobile");
  });

  it("classifies mid touch viewports as tablet", () => {
    expect(detectFormFactor(900, 5)).toBe("tablet");
  });

  it("classifies wide viewports as desktop", () => {
    expect(detectFormFactor(1280, 0)).toBe("desktop");
  });
});

describe("resolveRelease", () => {
  it("falls back to local when unset", () => {
    expect(resolveRelease(undefined)).toBe("local");
    expect(resolveRelease("  ")).toBe("local");
  });

  it("returns the configured app version", () => {
    expect(resolveRelease("abc123")).toBe("abc123");
  });
});

describe("buildWebVitalPayload", () => {
  it("includes metric fields, route, device, and release", () => {
    const payload = buildWebVitalPayload(
      { name: "LCP", value: 1200, id: "v1", rating: "good" },
      "/invoices",
      labDevice,
      "test-sha",
    );

    expect(payload).toEqual({
      name: "LCP",
      value: 1200,
      id: "v1",
      rating: "good",
      route: "/invoices",
      device: labDevice,
      release: "test-sha",
    });
  });
});

describe("reportWebVital", () => {
  const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

  afterEach(() => {
    infoSpy.mockClear();
    delete process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT;
  });

  afterAll(() => {
    infoSpy.mockRestore();
  });

  it("ignores non-CWV metric names", () => {
    reportWebVital({ name: "FCP", value: 100, id: "f1" }, "/invoices");
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("logs LCP with device and release outside production", () => {
    reportWebVital(
      { name: "LCP", value: 1500, id: "l1", rating: "good" },
      "/invoices",
    );

    expect(infoSpy).toHaveBeenCalledWith(
      "[web-vitals]",
      expect.objectContaining({
        name: "LCP",
        value: 1500,
        route: "/invoices",
        release: "local",
        device: expect.objectContaining({
          formFactor: expect.stringMatching(/mobile|tablet|desktop|unknown/),
        }),
      }),
    );
  });

  it("sendBeacons when an endpoint is configured", () => {
    process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT = "https://example.test/vitals";
    const sendBeacon = jest.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });

    reportWebVital({ name: "INP", value: 48, id: "i1" }, "/invoices/new");

    expect(sendBeacon).toHaveBeenCalledWith(
      "https://example.test/vitals",
      expect.stringContaining('"name":"INP"'),
    );
  });
});
