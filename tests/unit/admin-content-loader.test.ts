import { beforeEach, expect, it, vi } from "vitest";
import { article, project } from "../fixtures/admin-content";
const mock = vi.hoisted(() => ({
  guard: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  range: vi.fn(),
  order: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mock.guard }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: async () => ({ from: mock.from }),
}));
import {
  getAdminContent,
  getAdminContentEntry,
} from "../../src/lib/db/admin-content";
const articleRow = { ...article, article_translations: article.translations };
const projectRow = {
  ...project,
  slug: project.id,
  project_translations: project.translations,
};
beforeEach(() => {
  vi.resetAllMocks();
  const chain = {
    select: mock.select,
    eq: mock.eq,
    order: mock.order,
    range: mock.range,
    maybeSingle: mock.single,
  };
  mock.from.mockReturnValue(chain);
  mock.select.mockReturnValue(chain);
  mock.eq.mockReturnValue(chain);
  mock.order.mockReturnValue(chain);
});
it("denies both summary and detail reads before database access", async () => {
  mock.guard.mockRejectedValue(new Error("denied"));
  await expect(getAdminContent()).rejects.toThrow("denied");
  await expect(getAdminContentEntry("article", article.id)).rejects.toThrow(
    "denied",
  );
  expect(mock.from).not.toHaveBeenCalled();
});
it("selects only list columns and removes bodies from the returned payload", async () => {
  mock.range
    .mockResolvedValueOnce({ data: [articleRow], error: null })
    .mockResolvedValueOnce({ data: [projectRow], error: null });
  const result = await getAdminContent();
  expect(result).toHaveLength(2);
  expect(JSON.stringify(result)).not.toContain('"body"');
  expect(JSON.stringify(result)).not.toContain('"excerpt"');
  for (const [columns] of mock.select.mock.calls) {
    expect(columns).not.toContain("*");
    expect(columns).not.toContain("body");
  }
});
it("loads only the selected entry with its complete translations", async () => {
  mock.single.mockResolvedValue({ data: articleRow, error: null });
  expect(await getAdminContentEntry("article", article.id)).toEqual(article);
  expect(mock.eq).toHaveBeenCalledWith("id", article.id);
  mock.single.mockResolvedValue({ data: projectRow, error: null });
  expect(await getAdminContentEntry("project", project.id)).toEqual(project);
  expect(mock.eq).toHaveBeenCalledWith("slug", project.id);
});
it("distinguishes missing content from a failed query", async () => {
  mock.single.mockResolvedValue({ data: null, error: null });
  expect(await getAdminContentEntry("article", article.id)).toBeNull();
  mock.single.mockResolvedValue({ data: null, error: {} });
  await expect(getAdminContentEntry("article", article.id)).rejects.toThrow(
    "تعذر",
  );
});
