import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import {
  articleSchema,
  projectSchema,
  siteContentSchemas,
  type Locale,
  type SiteContentKey,
  type SiteContentMap,
} from "@/lib/content";
import { createContentClient } from "@/lib/supabase/server";
import { coverImageFields } from "@/lib/content-images";

const articleRow = z.object({
  ...coverImageFields,
  id: z.string(),
  date: z.string(),
  reading_time: z.number(),
  category: z.unknown(),
  article_translations: z.array(
    z.object({
      locale: z.enum(["ar", "en"]),
      slug: z.string(),
      title: z.string(),
      excerpt: z.string(),
      body: z.string(),
      published: z.boolean(),
    }),
  ),
});

function mapArticle(input: unknown) {
  const row = articleRow.parse(input);
  return articleSchema.parse({
    cover_image_path: row.cover_image_path,
    cover_image_url: row.cover_image_url,
    cover_image_alt: row.cover_image_alt,
    id: row.id,
    date: row.date,
    readingTime: row.reading_time,
    category: row.category,
    translations: Object.fromEntries(
      row.article_translations
        .filter((t) => t.published)
        .map((t) => [t.locale, t]),
    ),
  });
}

const projectRow = z.object({
  ...coverImageFields,
  slug: z.string(),
  sort_order: z.number(),
  year: z.string(),
  color: z.string(),
  stack: z.array(z.string()),
  project_translations: z.array(
    z.object({
      locale: z.enum(["ar", "en"]),
      title: z.string(),
      summary: z.string(),
      body: z.string(),
      category: z.string(),
    }),
  ),
});

function mapProject(input: unknown) {
  const row = projectRow.parse(input);
  return projectSchema.parse({
    cover_image_path: row.cover_image_path,
    cover_image_url: row.cover_image_url,
    cover_image_alt: row.cover_image_alt,
    slug: row.slug,
    index: String(row.sort_order).padStart(2, "0"),
    year: row.year,
    color: row.color,
    stack: row.stack,
    category: Object.fromEntries(
      row.project_translations.map((t) => [t.locale, t.category]),
    ),
    content: Object.fromEntries(
      row.project_translations.map((t) => [t.locale, t]),
    ),
  });
}

function checkError(error: { message: string } | null, operation: string) {
  if (error) {
    console.error(`Content query failed: ${operation}`, error.message);
    throw new Error("Unable to load site content. Please try again later.");
  }
}

export const getSiteUI = cache(async (locale: Locale) => {
  return getSiteContent("ui", locale);
});

const fetchSiteContent = cache(
  unstable_cache(
    async (key: SiteContentKey, locale: Locale) => {
      const { data, error } = await createContentClient()
        .from("site_content")
        .select("value")
        .eq("key", key)
        .eq("locale", locale)
        .single();
      checkError(error, `${key} content`);
      return data?.value;
    },
    ["site-copy-v2"],
    { revalidate: 300, tags: ["public-content"] },
  ),
);

export async function getSiteContent<K extends SiteContentKey>(
  key: K,
  locale: Locale,
): Promise<SiteContentMap[K]> {
  return siteContentSchemas[key].parse(
    await fetchSiteContent(key, locale),
  ) as SiteContentMap[K];
}

export const getHomeContent = cache(async (locale: Locale) =>
  getSiteContent("home", locale),
);

const coverColumns = "cover_image_path,cover_image_url,cover_image_alt";
export const PUBLIC_PAGE_SIZE = 12;

// Bounded summaries: bodies are only selected on detail routes.
export const getProjects = cache(
  unstable_cache(
    async (page = 1, size = PUBLIC_PAGE_SIZE) => {
      const { data, error } = await createContentClient()
        .from("projects")
        .select(
          `slug,sort_order,year,color,stack,${coverColumns},project_translations(locale,title,summary,category)`,
        )
        .eq("published", true)
        .order("sort_order")
        .order("slug")
        .range((page - 1) * size, page * size);
      checkError(error, "projects");
      return {
        items: (data ?? []).slice(0, size).map((row) => {
          const mapped = mapProject({
            ...row,
            project_translations: row.project_translations.map((t: object) => ({
              ...t,
              body: "",
            })),
          });
          return {
            ...mapped,
            content: {
              ar: {
                title: mapped.content.ar.title,
                summary: mapped.content.ar.summary,
              },
              en: {
                title: mapped.content.en.title,
                summary: mapped.content.en.summary,
              },
            },
          };
        }),
        hasMore: (data?.length ?? 0) > size,
      };
    },
    ["project-summaries-v2"],
    { revalidate: 300, tags: ["public-content"] },
  ),
);

export const getProjectBySlug = cache(
  unstable_cache(
    async (slug: string) => {
      const { data, error } = await createContentClient()
        .from("projects")
        .select("*, project_translations(*)")
        .eq("published", true)
        .eq("slug", slug)
        .maybeSingle();
      checkError(error, "project detail");
      return data ? mapProject(data) : null;
    },
    ["project-detail-v2"],
    { revalidate: 300, tags: ["public-content"] },
  ),
);

export const getArticles = cache(
  unstable_cache(
    async (page = 1, size = PUBLIC_PAGE_SIZE) => {
      const { data, error } = await createContentClient()
        .from("articles")
        .select(
          `id,date,reading_time,category,${coverColumns},article_translations!inner(locale,slug,title,excerpt,published)`,
        )
        .eq("published", true)
        .eq("article_translations.published", true)
        .order("date", { ascending: false })
        .order("id")
        .range((page - 1) * size, page * size);
      checkError(error, "articles");
      return {
        items: (data ?? []).slice(0, size).map((row) => {
          const mapped = mapArticle({
            ...row,
            article_translations: row.article_translations.map((t: object) => ({
              ...t,
              body: "",
            })),
          });
          return {
            ...mapped,
            translations: Object.fromEntries(
              Object.entries(mapped.translations).map(([locale, t]) => [
                locale,
                { slug: t.slug, title: t.title, excerpt: t.excerpt },
              ]),
            ),
          };
        }),
        hasMore: (data?.length ?? 0) > size,
      };
    },
    ["article-summaries-v2"],
    { revalidate: 300, tags: ["public-content"] },
  ),
);

export const findArticleBySlug = cache(
  unstable_cache(
    async (slug: string) => {
      const { data, error } = await createContentClient()
        .from("articles")
        .select(
          "*,article_translations(*),slug_match:article_translations!inner(slug)",
        )
        .eq("published", true)
        .eq("slug_match.slug", slug)
        .maybeSingle();
      checkError(error, "article detail");
      return data ? mapArticle(data) : null;
    },
    ["article-detail-v2"],
    { revalidate: 300, tags: ["public-content"] },
  ),
);
