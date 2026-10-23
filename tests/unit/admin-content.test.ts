import { describe, expect, it } from "vitest";
import { saveContentSchema, contentSlug } from "../../src/lib/admin/content";
import { article, project } from "../fixtures/admin-content";
describe("content validation", () => {
  it("accepts a single-language published article and a bilingual project", () => {
    expect(saveContentSchema.safeParse(article).success).toBe(true);
    expect(
      saveContentSchema.safeParse({ ...project, published: true }).success,
    ).toBe(true);
  });
  it("allows incomplete bodies in drafts but rejects incomplete published translations", () => {
    const draft = structuredClone(article);
    draft.translations[0].body = "";
    draft.published = false;
    expect(saveContentSchema.safeParse(draft).success).toBe(true);
    draft.published = true;
    expect(saveContentSchema.safeParse(draft).success).toBe(false);
    draft.translations[0].published = false;
    expect(saveContentSchema.safeParse(draft).success).toBe(false);
  });
  it("requires both project languages at publication and prevents duplicate translations", () => {
    expect(
      saveContentSchema.safeParse({
        ...project,
        published: true,
        translations: [project.translations[0]],
      }).success,
    ).toBe(false);
    expect(
      saveContentSchema.safeParse({
        ...article,
        translations: [article.translations[0], article.translations[0]],
      }).success,
    ).toBe(false);
  });
  it("supports Arabic slugs while rejecting paths, spaces, malformed dates and oversized bodies", () => {
    expect(contentSlug.safeParse("مقال-عربي").success).toBe(true);
    for (const value of [
      "../admin",
      "hello/world",
      "hello world",
      "?x=1",
      "%2F",
      "",
    ])
      expect(contentSlug.safeParse(value).success).toBe(false);
    expect(
      saveContentSchema.safeParse({ ...article, date: "2026-02-31" }).success,
    ).toBe(false);
    const oversized = structuredClone(article);
    oversized.translations[0].body = "x".repeat(80001);
    expect(saveContentSchema.safeParse(oversized).success).toBe(false);
  });
});
