import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { getSiteUI } from "@/lib/db/content";
import { createContentClient } from "@/lib/supabase/server";

export async function getCrawlerSiteUrl() {
  const [ar, en] = await Promise.all([getSiteUI("ar"), getSiteUI("en")]);
  const siteUrl = ar.seo?.siteUrl || en.seo?.siteUrl;
  if (!siteUrl) {
    throw new Error(
      "Set the production site URL in the admin SEO settings before submitting the sitemap.",
    );
  }
  const origin = new URL(siteUrl).origin;
  if (en.seo?.siteUrl && new URL(en.seo.siteUrl).origin !== origin) {
    throw new Error(
      "Arabic and English SEO settings must use the same site URL.",
    );
  }
  return origin;
}

const translation = z.object({ locale: z.enum(["ar", "en"]) });
const projectRow = z.object({
  slug: z.string().min(1),
  updated_at: z.string().datetime({ offset: true }),
  project_translations: z.array(translation),
});
const articleRow = z.object({
  id: z.string(),
  updated_at: z.string().datetime({ offset: true }),
  article_translations: z.array(
    translation.extend({
      slug: z.string().min(1),
      published: z.boolean(),
    }),
  ),
});

// Fetch lightweight records in stable batches, independently of UI pagination.
// A short server response must not truncate the sitemap if the API row cap changes.
async function readAll<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
) {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await read(rows.length, rows.length + 499);
    if (error)
      throw new Error(`Unable to load sitemap content: ${error.message}`);
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

export const getSitemapContent = unstable_cache(
  async () => {
    const client = createContentClient();
    const [projects, articles] = await Promise.all([
      readAll((from, to) =>
        client
          .from("projects")
          .select("slug,updated_at,project_translations(locale)")
          .eq("published", true)
          .order("slug")
          .range(from, to),
      ),
      readAll((from, to) =>
        client
          .from("articles")
          .select(
            "id,updated_at,article_translations!inner(locale,slug,published)",
          )
          .eq("published", true)
          .eq("article_translations.published", true)
          .order("id")
          .range(from, to),
      ),
    ]);
    return {
      projects: z.array(projectRow).parse(projects),
      articles: z.array(articleRow).parse(articles),
    };
  },
  ["sitemap-content-v1"],
  { revalidate: 300, tags: ["public-content"] },
);
