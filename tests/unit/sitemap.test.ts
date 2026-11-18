import { beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "../../src/app/sitemap";
import robots from "../../src/app/robots";

const mock = vi.hoisted(() => ({ origin: vi.fn(), content: vi.fn() }));
vi.mock("@/lib/db/sitemap", () => ({
  getCrawlerSiteUrl: mock.origin,
  getSitemapContent: mock.content,
}));
const modified = "2026-11-18T10:00:00Z";
beforeEach(() => {
  vi.resetAllMocks();
  mock.origin.mockResolvedValue("https://portfolio.example");
  mock.content.mockResolvedValue({
    projects: [
      {
        slug: "my-project",
        updated_at: modified,
        project_translations: [{ locale: "ar" }, { locale: "en" }],
      },
    ],
    articles: [
      {
        id: "article",
        updated_at: modified,
        article_translations: [
          { locale: "ar", slug: "مقال عربي", published: true },
          { locale: "en", slug: "english-article", published: true },
        ],
      },
      {
        id: "single-language",
        updated_at: modified,
        article_translations: [
          { locale: "en", slug: "only-english", published: true },
          { locale: "ar", slug: "draft", published: false },
        ],
      },
    ],
  });
});

describe("crawler metadata routes", () => {
  it("includes public pages and each published translation with reciprocal alternatives", async () => {
    const entries = await sitemap();
    expect(entries).toHaveLength(15);
    expect(entries.map((entry) => entry.url)).toEqual(
      expect.arrayContaining([
        "https://portfolio.example/ar",
        "https://portfolio.example/en/about",
        "https://portfolio.example/ar/contact",
        "https://portfolio.example/en/work",
        "https://portfolio.example/ar/blog",
        "https://portfolio.example/en/work/my-project",
      ]),
    );
    const arabicUrl = `https://portfolio.example/ar/blog/${encodeURIComponent("مقال عربي")}`;
    const languages = {
      ar: arabicUrl,
      en: "https://portfolio.example/en/blog/english-article",
    };
    for (const url of Object.values(languages)) {
      expect(entries.find((entry) => entry.url === url)).toEqual({
        url,
        lastModified: modified,
        alternates: { languages },
      });
    }
    expect(
      entries.find((entry) => entry.url.endsWith("only-english"))?.alternates
        ?.languages,
    ).toEqual({ en: "https://portfolio.example/en/blog/only-english" });
    expect(entries.some((entry) => /draft|admin|api/.test(entry.url))).toBe(
      false,
    );
    expect(entries[0].lastModified).toBeUndefined();
  });

  it("allows public crawling and advertises the sitemap", async () => {
    expect(await robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
      sitemap: "https://portfolio.example/sitemap.xml",
    });
  });

  it("fails on unavailable content instead of publishing an incomplete sitemap", async () => {
    mock.content.mockRejectedValue(new Error("database unavailable"));
    await expect(sitemap()).rejects.toThrow("database unavailable");
  });
});
