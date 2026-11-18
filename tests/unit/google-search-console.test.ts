import { generateKeyPairSync, verify } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getSearchConsoleReport } from "@/lib/google-search-console";
import { requireAdmin } from "@/lib/auth/admin";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: vi.fn() }));

const property = "https://elsayedgamal.vercel.app/";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const email = "dashboard@example.iam.gserviceaccount.com";
const fetchGoogle = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchGoogle.mockReset();
  vi.mocked(requireAdmin).mockReset();
  vi.stubGlobal("fetch", fetchGoogle);
  vi.stubEnv("SEARCH_CONSOLE_SITE", property);
  vi.stubEnv("SEARCH_CONSOLE_CLIENT_EMAIL", email);
  vi.stubEnv(
    "SEARCH_CONSOLE_PRIVATE_KEY",
    privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString()
      .replace(/\n/g, "\\n"),
  );
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T03:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("requests an authenticated finalized report in Pacific dates and retains missing daily rows", async () => {
  const totals = { clicks: 8, impressions: 40, ctr: 0.2, position: 3.4 };
  fetchGoogle.mockImplementation(async (input, init) => {
    if (input === "https://oauth2.googleapis.com/token") {
      expect(init?.method).toBe("POST");
      const body = init?.body as URLSearchParams;
      expect(body.get("grant_type")).toBe(
        "urn:ietf:params:oauth:grant-type:jwt-bearer",
      );
      const [header, claims, signature] = body.get("assertion")!.split(".");
      expect(
        verify(
          "RSA-SHA256",
          Buffer.from(`${header}.${claims}`),
          publicKey,
          Buffer.from(signature, "base64url"),
        ),
      ).toBe(true);
      expect(
        JSON.parse(Buffer.from(claims, "base64url").toString()),
      ).toMatchObject({
        iss: email,
        aud: input,
        scope: "https://www.googleapis.com/auth/webmasters.readonly",
      });
      return Response.json({ access_token: "mock-access-token" });
    }
    expect(input).toBe(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer mock-access-token",
    );
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      startDate: "2026-11-08",
      endDate: "2026-11-14",
      dataState: "final",
      type: "web",
    });
    const key = {
      date: "2026-11-14",
      query: "next sitemap",
      page: `${property}ar`,
    }[body.dimensions[0] as "date" | "query" | "page"];
    return Response.json({ rows: [key ? { ...totals, keys: [key] } : totals] });
  });
  const result = await getSearchConsoleReport(7);
  expect(result.status).toBe("ready");
  if (result.status !== "ready") return;
  expect(result.report.total).toEqual(totals);
  expect(result.report.daily).toHaveLength(7);
  expect(result.report.daily[0]).toEqual({
    date: "2026-11-08",
    clicks: null,
    impressions: null,
  });
  expect(result.report.daily.at(-1)).toEqual({
    date: "2026-11-14",
    clicks: 8,
    impressions: 40,
  });
  expect(result.report.queries[0].label).toBe("next sitemap");
  expect(result.report.pages[0].label).toBe(`${property}ar`);
  expect(fetchGoogle).toHaveBeenCalledTimes(5);
});

it("does not contact Google for unauthorized or unconfigured requests", async () => {
  vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("access denied"));
  await expect(getSearchConsoleReport(30)).rejects.toThrow("access denied");
  vi.stubEnv("SEARCH_CONSOLE_PRIVATE_KEY", "");
  await expect(getSearchConsoleReport(30)).resolves.toEqual({
    status: "unconfigured",
  });
  expect(fetchGoogle).not.toHaveBeenCalled();
});

it("handles Google errors without exposing the response body", async () => {
  fetchGoogle.mockResolvedValue(
    new Response('{"error":"invalid_grant"}', { status: 400 }),
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  await expect(getSearchConsoleReport(90)).resolves.toEqual({
    status: "unavailable",
  });
  expect(warn).toHaveBeenCalledWith(
    "Search Console report unavailable:",
    "Google token HTTP 400",
  );
});
