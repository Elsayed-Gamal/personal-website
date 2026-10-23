import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { contentEntrySchema, type ContentEntry } from "@/lib/admin/content";

export async function getAdminContent(): Promise<ContentEntry[]> {
  await requireAdmin();
  const client = await createAuthClient();
  async function read(kind: "article" | "project") {
    const result: ContentEntry[] = [];
    for (let start = 0; ; start += 100) {
      const { data, error } =
        kind === "article"
          ? await client
              .from("articles")
              .select("*,article_translations(*)")
              .order("id")
              .range(start, start + 99)
          : await client
              .from("projects")
              .select("*,project_translations(*)")
              .order("slug")
              .range(start, start + 99);
      if (error) throw new Error("تعذر تحميل المحتوى. حاول مجددًا.");
      for (const row of data ?? [])
        result.push(
          contentEntrySchema.parse({
            ...row,
            kind,
            id: kind === "article" ? row.id : row.slug,
            translations: (kind === "article"
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
