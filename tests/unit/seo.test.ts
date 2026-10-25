import { describe, expect, it } from "vitest";
import { buildSeoMetadata, emptySeo, seoSchema } from "../../src/lib/seo";
import { saveSettingsSchema } from "../../src/lib/admin/settings";
import seed from "../../scripts/page-content-seed.json";

describe("editable SEO settings", () => {
  it("supports existing rows and blank overrides without placeholder domains", () => {
    const metadata = buildSeoMetadata(seed.ui.ar, "ar");
    expect(metadata.title).toEqual({
      absolute: `${seed.ui.ar.brandName} — ${seed.ui.ar.brandRole}`,
    });
    expect(metadata.description).toBe(seed.ui.ar.footer);
    expect(metadata.metadataBase).toBeUndefined();
    expect(metadata.alternates).toBeUndefined();
    expect(seoSchema.safeParse(emptySeo).success).toBe(true);
  });

  it("validates SEO through the settings action schema", () => {
    const input = {
      key: "ui",
      locale: "ar",
      version: "2026-10-24T00:00:00Z",
      value: { ...seed.ui.ar, seo: { ...emptySeo, title: "عنوان مخصص" } },
    };
    expect(saveSettingsSchema.safeParse(input).success).toBe(true);
    for (const siteUrl of [
      "not-a-url",
      "javascript:alert(1)",
      "https://example.org/ar",
      "https://example.org/?q=1",
      "https://user:password@example.org",
    ]) {
      expect(
        saveSettingsSchema.safeParse({
          ...input,
          value: { ...input.value, seo: { ...emptySeo, siteUrl } },
        }).success,
      ).toBe(false);
    }
    expect(
      seoSchema.safeParse({ ...emptySeo, imageUrl: "data:image/svg+xml,test" })
        .success,
    ).toBe(false);
    expect(
      seoSchema.safeParse({ ...emptySeo, title: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      seoSchema.safeParse({ ...emptySeo, twitterHandle: "https://x.com/user" })
        .success,
    ).toBe(false);
  });

  it("uses localized settings in search and sharing metadata with page-specific URLs", () => {
    const ui = {
      ...seed.ui.en,
      seo: {
        ...emptySeo,
        title: "My portfolio",
        description: "My site description",
        siteUrl: "https://portfolio.example",
        imageUrl: "https://cdn.example/share.png",
        imageAlt: "Portfolio preview",
        twitterHandle: "@developer",
      },
    };
    const home = buildSeoMetadata(ui, "en", { path: "/en" });
    expect(home.title).toEqual({ absolute: "My portfolio" });
    expect(home.description).toBe("My site description");
    expect(home.alternates?.canonical).toBe("https://portfolio.example/en");
    const article = buildSeoMetadata(ui, "en", {
      title: "Article title",
      description: "Article excerpt",
      path: "/en/blog/article",
      article: true,
    });
    expect(article.title).toEqual({ absolute: "Article title — My portfolio" });
    expect(article.alternates?.canonical).toBe(
      "https://portfolio.example/en/blog/article",
    );
    expect(article.openGraph).toMatchObject({
      type: "article",
      description: "Article excerpt",
      images: [{ url: ui.seo.imageUrl, alt: "Portfolio preview" }],
    });
    expect(article.twitter).toMatchObject({
      card: "summary_large_image",
      creator: "@developer",
      title: "Article title — My portfolio",
    });
    const withCover = buildSeoMetadata(ui, "en", {
      title: "Article title",
      imageUrl:
        "https://cdoaudugbjrkhyhivaaa.supabase.co/storage/v1/object/public/content-images/articles/00000000-0000-4000-8000-000000000001.webp",
      imageAlt: "Article cover",
    });
    expect(withCover.openGraph).toMatchObject({
      images: [
        {
          url: expect.stringContaining("/content-images/articles/"),
          alt: "Article cover",
        },
      ],
    });
    expect(withCover.twitter).toMatchObject({
      card: "summary_large_image",
      images: [
        {
          url: expect.stringContaining("/content-images/articles/"),
          alt: "Article cover",
        },
      ],
    });
  });
});
