import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createContentClient: () => ({ rpc: mock.rpc }),
}));
import { POST } from "../../src/app/api/analytics/page-view/route";
const payload = {
  eventId: "527132ce-814c-4fe3-85f6-229e48d6df06",
  path: "/ar",
};
function req(
  body = JSON.stringify(payload),
  headers: Record<string, string> = {},
) {
  return new NextRequest("https://site.test/api/analytics/page-view", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://site.test",
      ...headers,
    },
    body,
  });
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("ANALYTICS_DISABLED", "false");
  vi.stubEnv("VERCEL", "");
  mock.rpc.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
describe("page-view endpoint", () => {
  it("rejects foreign origins, oversized bodies and disallowed routes", async () => {
    expect(
      (await POST(req(undefined, { origin: "https://other.test" }))).status,
    ).toBe(403);
    expect((await POST(req("x".repeat(2049)))).status).toBe(413);
    expect(
      (await POST(req(JSON.stringify({ ...payload, path: "/admin" })))).status,
    ).toBe(400);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("does not record requests with privacy opt-outs", async () => {
    expect((await POST(req(undefined, { dnt: "1" }))).status).toBe(204);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("checks the browser host when Next uses an internal server hostname", async () => {
    mock.rpc.mockResolvedValue({ data: true, error: null });
    const request = new NextRequest(
      "http://localhost:3103/api/analytics/page-view",
      {
        method: "POST",
        headers: {
          host: "127.0.0.1:3103",
          origin: "http://127.0.0.1:3103",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    expect((await POST(request)).status).toBe(204);
    expect((await POST(req(undefined, { host: "other.test" }))).status).toBe(
      403,
    );
    expect((await POST(req(undefined, { origin: "null" }))).status).toBe(403);
  });
  it("forwards only the normalized path and server-derived country", async () => {
    mock.rpc.mockResolvedValue({ data: true, error: null });
    expect(
      (
        await POST(
          req(JSON.stringify({ ...payload, path: "/ar?secret=value" }), {
            "x-vercel-ip-country": "US",
          }),
        )
      ).status,
    ).toBe(204);
    expect(mock.rpc).toHaveBeenCalledWith("record_page_view", {
      p_event_id: payload.eventId,
      p_path: "/ar",
      p_country: "ZZ",
    });
    mock.rpc.mockResolvedValue({ data: false, error: null });
    expect((await POST(req())).status).toBe(429);
  });
});
