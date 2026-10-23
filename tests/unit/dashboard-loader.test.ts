import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ guard: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mock.guard }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({ rpc: mock.rpc }),
}));
import { getDashboard } from "../../src/lib/db/dashboard";
beforeEach(() => {
  vi.resetAllMocks();
});
describe("dashboard loader", () => {
  it("requires authorization before querying private aggregates", async () => {
    mock.guard.mockRejectedValue(new Error("unauthorized"));
    await expect(getDashboard(30)).rejects.toThrow("unauthorized");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("reports database failure instead of showing fabricated zero counts", async () => {
    mock.guard.mockResolvedValue({});
    mock.rpc.mockResolvedValue({
      data: null,
      error: { message: "unavailable" },
    });
    await expect(getDashboard(7)).rejects.toThrow("تعذر");
  });
});
