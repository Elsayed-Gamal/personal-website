import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ from: vi.fn(), ui: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({
  createContentClient: () => ({ from: mock.from }),
}));
vi.mock("@/lib/db/content", () => ({ getSiteUI: mock.ui }));
import { getCrawlerSiteUrl, getSitemapContent } from "../../src/lib/db/sitemap";

beforeEach(() => vi.resetAllMocks());

describe("sitemap data", () => {
  it("reads beyond the first batch even when the API returns fewer than requested", async () => {
    const projectRows = Array.from({ length: 21 }, (_, i) => ({
      slug: `project-${i}`,
      updated_at: "2026-11-18T10:00:00+00:00",
      project_translations: [{ locale: "ar" }, { locale: "en" }],
    }));
    const queries: Record<string, ReturnType<typeof makeQuery>> = {};
    function makeQuery(rows: unknown[]) {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn(async (from: number) => ({
          data: rows.slice(from, from + 7),
          error: null,
        })),
      };
    }
    queries.projects = makeQuery(projectRows);
    queries.articles = makeQuery([]);
    mock.from.mockImplementation((table: string) => queries[table]);
    const result = await getSitemapContent();
    expect(result.projects).toEqual(projectRows);
    expect(queries.projects.range.mock.calls.map(([from]) => from)).toEqual([
      0, 7, 14, 21,
    ]);
    expect(queries.projects.eq).toHaveBeenCalledWith("published", true);
    expect(queries.articles.eq).toHaveBeenCalledWith("published", true);
    expect(queries.articles.eq).toHaveBeenCalledWith(
      "article_translations.published",
      true,
    );
    expect(queries.projects.order).toHaveBeenCalledWith("slug");
    expect(queries.articles.order).toHaveBeenCalledWith("id");
  });

  it("propagates query failures", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "offline" } }),
    };
    mock.from.mockReturnValue(query);
    await expect(getSitemapContent()).rejects.toThrow("offline");
  });

  it("uses the configured domain from either locale without inventing a domain", async () => {
    mock.ui.mockImplementation(async (locale: string) => ({
      seo: { siteUrl: locale === "en" ? "https://portfolio.example/" : "" },
    }));
    expect(await getCrawlerSiteUrl()).toBe("https://portfolio.example");
    mock.ui.mockResolvedValue({});
    await expect(getCrawlerSiteUrl()).rejects.toThrow("site URL");
    mock.ui.mockImplementation(async (locale: string) => ({
      seo: { siteUrl: `https://${locale}.example` },
    }));
    await expect(getCrawlerSiteUrl()).rejects.toThrow("same site URL");
  });
});
