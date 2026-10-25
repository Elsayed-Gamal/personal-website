import "server-only";
import { cache } from "react";
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

const fetchSiteContent = cache(async (key: SiteContentKey, locale: Locale) => {
  const { data, error } = await createContentClient()
    .from("site_content")
    .select("value")
    .eq("key", key)
    .eq("locale", locale)
    .single();
  checkError(error, `${key} content`);
  return data?.value;
});

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

export const getProjects = cache(async () => {
  const { data, error } = await createContentClient()
    .from("projects")
    .select("*, project_translations(*)")
    .eq("published", true)
    .order("sort_order")
    .order("slug");
  checkError(error, "projects");
  return (data ?? []).map(mapProject);
});

export const getProjectBySlug = cache(async (slug: string) => {
  const { data, error } = await createContentClient()
    .from("projects")
    .select("*, project_translations(*)")
    .eq("published", true)
    .eq("slug", slug)
    .maybeSingle();
  checkError(error, "project detail");
  return data ? mapProject(data) : null;
});

export const getArticles = cache(async () => {
  const { data, error } = await createContentClient()
    .from("articles")
    .select("*, article_translations(*)")
    .eq("published", true)
    .order("date", { ascending: false })
    .order("id");
  checkError(error, "articles");
  return (data ?? [])
    .filter((row) =>
      row.article_translations.some((t: { published: boolean }) => t.published),
    )
    .map(mapArticle);
});

export const findArticleBySlug = cache(async (slug: string) => {
  const client = createContentClient();
  const { data: translation, error: lookupError } = await client
    .from("article_translations")
    .select("article_id")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  checkError(lookupError, "article slug");
  if (!translation) return null;
  const { data, error } = await client
    .from("articles")
    .select("*, article_translations(*)")
    .eq("id", translation.article_id)
    .eq("published", true)
    .maybeSingle();
  checkError(error, "article detail");
  return data ? mapArticle(data) : null;
});
