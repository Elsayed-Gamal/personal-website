import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import {
  contentEntrySchema,
  contentSummarySchema,
  type ContentEntry,
  type ContentSummary,
  type ContentKind,
} from "@/lib/admin/content";

export async function getAdminContent(): Promise<ContentSummary[]> {
  await requireAdmin();
  const client = await createAuthClient();
  async function read(kind: "article" | "project") {
    const result: ContentSummary[] = [];
    for (let start = 0; ; start += 100) {
      const { data, error } =
        kind === "article"
          ? await client
              .from("articles")
              .select(
                "id,updated_at,published,date,article_translations(locale,slug,title,published)",
              )
              .order("id")
              .range(start, start + 99)
          : await client
              .from("projects")
              .select(
                "slug,updated_at,published,year,sort_order,project_translations(locale,title)",
              )
              .order("slug")
              .range(start, start + 99);
      if (error) throw new Error("تعذر تحميل المحتوى. حاول مجددًا.");
      for (const row of data ?? [])
        result.push(
          contentSummarySchema.parse({
            ...row,
            kind,
            id: "id" in row ? row.id : row.slug,
            translations: ("article_translations" in row
              ? row.article_translations
              : row.project_translations
            ).sort((a: { locale: string }, b: { locale: string }) =>
              a.locale.localeCompare(b.locale),
            ),
          }),
        );
      if (!data || data.length < 100) return result;
    }
  }
  const [articles, projects] = await Promise.all([
    read("article"),
    read("project"),
  ]);
  return [...articles, ...projects];
}

export async function getAdminContentEntry(
  kind: ContentKind,
  id: string,
): Promise<ContentEntry | null> {
  await requireAdmin();
  const client = await createAuthClient();
  const { data, error } =
    kind === "article"
      ? await client
          .from("articles")
          .select("*,article_translations(*)")
          .eq("id", id)
          .maybeSingle()
      : await client
          .from("projects")
          .select("*,project_translations(*)")
          .eq("slug", id)
          .maybeSingle();
  if (error) throw new Error("تعذر تحميل بيانات المحتوى.");
  if (!data) return null;
  return contentEntrySchema.parse({
    ...data,
    kind,
    id: kind === "article" ? data.id : data.slug,
    translations: (kind === "article"
      ? data.article_translations
      : data.project_translations
    ).sort((a: { locale: string }, b: { locale: string }) =>
      a.locale.localeCompare(b.locale),
    ),
  });
}
