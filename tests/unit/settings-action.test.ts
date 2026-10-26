import { beforeEach, describe, expect, it, vi } from "vitest";
import seed from "../../scripts/page-content-seed.json";

const mock = vi.hoisted(() => ({
  guard: vi.fn(),
  client: vi.fn(),
  revalidate: vi.fn(),
  updateTag: vi.fn(),
}));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mock.guard }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: mock.client,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mock.revalidate,
  updateTag: mock.updateTag,
}));
import { saveSettings } from "../../src/app/admin/(protected)/settings/actions";

const input = {
  key: "ui",
  locale: "ar",
  version: "2026-10-23T00:00:00Z",
  value: seed.ui.ar,
};
beforeEach(() => {
  vi.resetAllMocks();
  mock.guard.mockResolvedValue({ email: "owner@example.com" });
});
describe("settings save action", () => {
  it("checks authorization before accessing data", async () => {
    mock.guard.mockRejectedValue(new Error("unauthorized"));
    await expect(saveSettings(input)).rejects.toThrow("unauthorized");
    expect(mock.client).not.toHaveBeenCalled();
  });
  it("rejects invalid payloads before querying the database", async () => {
    expect((await saveSettings({ ...input, key: "messages" })).ok).toBe(false);
    expect(mock.client).not.toHaveBeenCalled();
  });
  it("saves the selected row using its previous version and revalidates public content", async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { updated_at: "2026-10-24T00:00:00Z" },
        error: null,
      }),
    };
    mock.client.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
    expect((await saveSettings(input)).ok).toBe(true);
    expect(query.eq).toHaveBeenCalledWith("updated_at", input.version);
    expect(query.eq).toHaveBeenCalledWith("key", "ui");
    expect(query.eq).toHaveBeenCalledWith("locale", "ar");
    expect(query.update).toHaveBeenCalledWith({ value: input.value });
    expect(mock.revalidate).toHaveBeenCalledWith("/ar", "layout");
    expect(mock.updateTag).toHaveBeenCalledWith("public-content");
  });
  it("reports conflicts and database failures without claiming success", async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mock.client.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
    expect(await saveSettings(input)).toMatchObject({
      ok: false,
      conflict: true,
    });
    query.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "denied" },
    } as never);
    expect((await saveSettings(input)).ok).toBe(false);
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
});
