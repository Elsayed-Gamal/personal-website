import type { MetadataRoute } from "next";
import { locales } from "@/lib/content";
import { getCrawlerSiteUrl, getSitemapContent } from "@/lib/db/sitemap";

// Generate on request; the underlying content cache is invalidated by admin saves.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [origin, content] = await Promise.all([
    getCrawlerSiteUrl(),
    getSitemapContent(),
  ]);
  const entries: MetadataRoute.Sitemap = [];
  function addLocalized(
    languages: Record<string, string>,
    lastModified?: string,
  ) {
    for (const url of Object.values(languages)) {
      entries.push({
        url,
        ...(lastModified ? { lastModified } : {}),
        alternates: { languages },
      });
    }
  }
  for (const path of ["", "/about", "/contact", "/work", "/blog"]) {
    addLocalized(
      Object.fromEntries(
        locales.map((locale) => [locale, `${origin}/${locale}${path}`]),
      ),
    );
  }
  for (const project of content.projects) {
    addLocalized(
      Object.fromEntries(
        project.project_translations.map(({ locale }) => [
          locale,
          `${origin}/${locale}/work/${encodeURIComponent(project.slug)}`,
        ]),
      ),
      project.updated_at,
    );
  }
  for (const article of content.articles) {
    addLocalized(
      Object.fromEntries(
        article.article_translations
          .filter((translation) => translation.published)
          .map(({ locale, slug }) => [
            locale,
            `${origin}/${locale}/blog/${encodeURIComponent(slug)}`,
          ]),
      ),
      article.updated_at,
    );
  }
  return entries;
}
