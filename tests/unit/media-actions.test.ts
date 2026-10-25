import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  guard: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  remove: vi.fn(),
  page: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mock.guard }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: mock.client,
}));
vi.mock("@/lib/db/media", () => ({ getMediaPage: mock.page }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
import { loadMedia, deleteMedia } from "@/app/admin/(protected)/media/actions";
const path = "articles/00000000-0000-4000-8000-000000000001.png";
beforeEach(() => {
  vi.resetAllMocks();
  mock.client.mockResolvedValue({
    rpc: mock.rpc,
    storage: { from: mock.from },
  });
  mock.from.mockReturnValue({ remove: mock.remove });
});
it("authorizes reads and deletes before accessing any data", async () => {
  mock.guard.mockRejectedValue(new Error("denied"));
  await expect(loadMedia({ page: 0, folder: "all" })).rejects.toThrow("denied");
  await expect(deleteMedia(path)).rejects.toThrow("denied");
  expect(mock.client).not.toHaveBeenCalled();
  expect(mock.page).not.toHaveBeenCalled();
});
it("rejects arbitrary targets and invalid pagination", async () => {
  expect((await deleteMedia("other-bucket/file.png")).ok).toBe(false);
  expect((await deleteMedia("https://example.com/a.png")).ok).toBe(false);
  expect((await loadMedia({ page: -1 })).ok).toBe(false);
  expect(mock.client).not.toHaveBeenCalled();
});
it("never calls Storage remove if the database reports a reference", async () => {
  mock.rpc.mockResolvedValue({ error: { code: "23503" } });
  expect(await deleteMedia(path)).toMatchObject({
    ok: false,
    message: expect.stringContaining("مستخدمة"),
  });
  expect(mock.remove).not.toHaveBeenCalled();
});
it("reserves an exact path before deleting it with the Storage API", async () => {
  mock.rpc.mockResolvedValue({ error: null });
  mock.remove.mockImplementation(async () => {
    expect(mock.rpc).toHaveBeenCalledWith("prepare_content_image_deletion", {
      image_path: path,
    });
    return { data: [{ name: path }], error: null };
  });
  expect((await deleteMedia(path)).ok).toBe(true);
  expect(mock.from).toHaveBeenCalledWith("content-images");
  expect(mock.remove).toHaveBeenCalledWith([path]);
  expect(mock.revalidate).toHaveBeenCalledWith("/admin/media");
});
it("does not report success when Storage returns an error or no deleted objects", async () => {
  mock.rpc.mockResolvedValue({ error: null });
  mock.remove.mockResolvedValueOnce({ data: null, error: { message: "down" } });
  expect((await deleteMedia(path)).ok).toBe(false);
  mock.remove.mockResolvedValueOnce({ data: [], error: null });
  expect((await deleteMedia(path)).ok).toBe(false);
  expect(mock.revalidate).not.toHaveBeenCalled();
});
