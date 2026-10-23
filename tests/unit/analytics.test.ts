import { afterEach, describe, expect, it, vi } from "vitest";
import {
  publicAnalyticsPath,
  countryFromHeaders,
  dashboardDays,
  viewTrend,
  shouldIgnoreAnalytics,
  analyticsEnabled,
} from "../../src/lib/analytics";
afterEach(() => vi.unstubAllEnvs());
describe("analytics boundaries", () => {
  it("accepts public routes and strips query strings without exposing arbitrary paths", () => {
    expect(
      publicAnalyticsPath("/ar/contact?email=private@example.com#form"),
    ).toBe("/ar/contact");
    expect(
      publicAnalyticsPath("/en/blog/" + encodeURIComponent("مقال-عربي")),
    ).toBe("/en/blog/مقال-عربي");
    for (const value of [
      "/admin/dashboard",
      "/api/contact",
      "/en/secret",
      "https://example.com/en",
      "/en/blog/%2Fadmin",
      "/en/%xx",
    ])
      expect(publicAnalyticsPath(value)).toBeNull();
  });
  it("uses country headers only on the supported hosting platform", () => {
    const headers = new Headers({ "x-vercel-ip-country": "EG" });
    expect(countryFromHeaders(headers, false)).toBe("ZZ");
    expect(countryFromHeaders(headers, true)).toBe("EG");
    expect(countryFromHeaders(new Headers(), true)).toBe("ZZ");
  });
  it("respects privacy signals and keeps bots, development and preview out", () => {
    expect(shouldIgnoreAnalytics(new Headers({ dnt: "1" }))).toBe(true);
    expect(shouldIgnoreAnalytics(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(
      shouldIgnoreAnalytics(new Headers({ "user-agent": "Googlebot" })),
    ).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(analyticsEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(analyticsEnabled()).toBe(false);
  });
  it("validates periods and avoids misleading percent change from zero", () => {
    expect(dashboardDays("90")).toBe(90);
    expect(dashboardDays("bad")).toBe(30);
    expect(viewTrend(10, 0)).toBeNull();
    expect(viewTrend(15, 10)).toBe(50);
    expect(viewTrend(0, 10)).toBe(-100);
  });
});
