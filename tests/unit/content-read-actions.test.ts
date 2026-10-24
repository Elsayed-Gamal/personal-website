import { beforeEach, expect, it, vi } from "vitest";
import { article } from "../fixtures/admin-content";
const mock = vi.hoisted(() => ({ guard: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mock.guard }));
vi.mock("@/lib/db/admin-content", () => ({ getAdminContentEntry: mock.read }));
import { loadContent } from "../../src/app/admin/(protected)/content/read-actions";
beforeEach(() => vi.resetAllMocks());

it("authorizes before loading details", async () => {
  mock.guard.mockRejectedValue(new Error("denied"));
  await expect(loadContent(article)).rejects.toThrow("denied");
  expect(mock.read).not.toHaveBeenCalled();
});
it("validates identity and reports deleted rows and backend failures", async () => {
  expect((await loadContent({ kind: "article", id: "../bad" })).ok).toBe(false);
  expect(mock.read).not.toHaveBeenCalled();
  mock.read.mockResolvedValue(null);
  expect((await loadContent(article)).ok).toBe(false);
  mock.read.mockRejectedValue(new Error("private backend message"));
  const result = await loadContent(article);
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private backend");
});
it("returns the complete entry, not a list summary", async () => {
  mock.read.mockResolvedValue(article);
  expect(await loadContent(article)).toEqual({ ok: true, entry: article });
  expect(mock.read).toHaveBeenCalledWith(article.kind, article.id);
});
