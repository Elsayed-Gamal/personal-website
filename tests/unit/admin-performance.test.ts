import { afterEach, expect, it, vi } from "vitest";
import { measureAdminOperation } from "../../src/lib/admin/performance";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("does not log by default and preserves results", async () => {
  vi.stubEnv("ADMIN_PERFORMANCE_LOG", "false");
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  expect(await measureAdminOperation("server.auth", async () => "ok")).toBe(
    "ok",
  );
  expect(log).not.toHaveBeenCalled();
});
it("logs only duration and stage, preserving failures without leaking their contents", async () => {
  vi.stubEnv("ADMIN_PERFORMANCE_LOG", "true");
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  await expect(
    measureAdminOperation("server.auth", async () => {
      throw new Error("secret");
    }),
  ).rejects.toThrow("secret");
  expect(log).toHaveBeenCalledOnce();
  expect(JSON.parse(log.mock.calls[0][1])).toEqual({
    stage: "server.auth",
    ms: expect.any(Number),
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
});
