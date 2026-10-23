import { describe, expect, it } from "vitest";
import snapshot from "../../scripts/seed-content.json";
import pageContent from "../../scripts/page-content-seed.json";
import {
  articleSchema,
  projectSchema,
  siteContentSchemas,
  getArticleLocale,
  getArticleTranslation,
} from "../../src/lib/content";

describe("migrated bilingual content", () => {
  const articles = snapshot.articles.map((value) => articleSchema.parse(value));
  it("preserves all original records and translations", () => {
    expect(
      snapshot.projects.map((value) => projectSchema.parse(value)),
    ).toHaveLength(3);
    expect(articles).toHaveLength(3);
    expect(articles.flatMap((a) => Object.values(a.translations))).toHaveLength(
      4,
    );
    expect(() =>
      Object.entries(pageContent).forEach(([key, translations]) =>
        Object.values(translations).forEach((value) =>
          siteContentSchemas[key as keyof typeof siteContentSchemas].parse(value),
        ),
      ),
    ).not.toThrow();
  });
  it("uses the requested language when both translations exist", () => {
    expect(getArticleTranslation(articles[0], "ar").slug).toBe(
      "systems-that-scale-ar",
    );
    expect(getArticleTranslation(articles[0], "en").slug).toBe(
      "systems-that-scale",
    );
  });
  it("falls back in both directions without inventing a translation", () => {
    expect(getArticleLocale(articles[1], "en")).toBe("ar");
    expect(getArticleLocale(articles[2], "ar")).toBe("en");
    expect(getArticleTranslation(articles[1], "en").title).toBe(
      snapshot.articles[1].translations.ar?.title,
    );
  });
  it("rejects an article with no published translation", () => {
    expect(() =>
      articleSchema.parse({ ...articles[0], translations: {} }),
    ).toThrow();
  });
});
