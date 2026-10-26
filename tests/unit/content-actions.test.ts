import { beforeEach, describe, expect, it, vi } from "vitest";
import { article } from "../fixtures/admin-content";
const mock = vi.hoisted(() => ({
  guard: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
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
import {
  saveContent,
  deleteContent,
} from "../../src/app/admin/(protected)/content/actions";
beforeEach(() => {
  vi.resetAllMocks();
  mock.guard.mockResolvedValue({});
  mock.client.mockResolvedValue({ rpc: mock.rpc });
});
describe("content actions", () => {
  it("authorizes before save or delete", async () => {
    mock.guard.mockRejectedValue(new Error("unauthorized"));
    await expect(saveContent(article)).rejects.toThrow("unauthorized");
    await expect(deleteContent(article)).rejects.toThrow("unauthorized");
    expect(mock.client).not.toHaveBeenCalled();
  });
  it("validates before the RPC and normalizes missing category translations", async () => {
    expect((await saveContent({ ...article, reading_time: 0 })).ok).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
    mock.rpc.mockResolvedValue({ data: "2026-10-24T01:00:00Z", error: null });
    expect(
      (await saveContent({ ...article, category: { ar: "تطوير", en: "" } })).ok,
    ).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith("save_site_entry", {
      entry: expect.objectContaining({
        updated_at: article.updated_at,
        category: { ar: "تطوير", en: "تطوير" },
      }),
    });
    expect(mock.revalidate).toHaveBeenCalledWith("/ar", "layout");
    expect(mock.updateTag).toHaveBeenCalledWith("public-content");
    expect(mock.revalidate).toHaveBeenCalledWith("/en", "layout");
    expect(mock.revalidate).toHaveBeenCalledWith("/admin/content");
    expect(mock.revalidate).toHaveBeenCalledWith("/admin/dashboard");
  });
  it("reports duplicate slugs, stale writes, and errors without losing drafts", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await saveContent(article)).toMatchObject({
      ok: false,
      message: expect.stringContaining("الرابط"),
    });
    mock.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    expect(await saveContent(article)).toMatchObject({
      ok: false,
      conflict: true,
    });
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
  it("deletes only the requested kind, identity and loaded version", async () => {
    mock.rpc.mockResolvedValue({ error: null });
    expect(await deleteContent(article)).toEqual({ ok: true });
    expect(mock.revalidate).toHaveBeenCalledWith("/admin/dashboard");
    expect(mock.rpc).toHaveBeenCalledWith("delete_site_entry", {
      entry_kind: "article",
      entry_id: article.id,
      expected_version: article.updated_at,
    });
    expect((await deleteContent({ ...article, updated_at: null })).ok).toBe(
      false,
    );
  });
});
