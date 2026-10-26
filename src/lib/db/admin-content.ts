import {
  contentQuerySchema,
  contentPageSchema,
  ADMIN_PAGE_SIZE,
  type ContentQuery,
  type ContentPage,
} from "@/lib/admin/pagination";
import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import {
  contentEntrySchema,
  type ContentEntry,
  type ContentKind,
} from "@/lib/admin/content";

export async function getAdminContent(
  input: ContentQuery = { page: 1, search: "", kind: "article", status: "all" },
): Promise<ContentPage> {
  await requireAdmin();
  const query = contentQuerySchema.parse(input);
  const client = await createAuthClient();
  const { data, error } = await client.rpc("list_admin_content", {
    p_page: query.page,
    p_size: ADMIN_PAGE_SIZE,
    p_kind: query.kind,
    p_status: query.status,
    p_search: query.search,
  });
  if (error) throw new Error("تعذر تحميل المحتوى. حاول مجددًا.");
  return contentPageSchema.parse(data);
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
