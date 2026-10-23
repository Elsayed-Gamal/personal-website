"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import {
  deleteContentSchema,
  saveContentSchema,
  type ContentResult,
} from "@/lib/admin/content";
function failure(code?: string) {
  if (code === "40001")
    return {
      ok: false as const,
      conflict: true,
      message: "تغير المحتوى منذ فتحه. أعد تحميل أحدث نسخة قبل المتابعة.",
    };
  if (code === "23505")
    return {
      ok: false as const,
      message:
        "الرابط مستخدم بالفعل. اختر رابطًا مختلفًا للمشروع أو ترجمة المقال.",
    };
  if (code === "42501")
    return {
      ok: false as const,
      message: "ليس لديك صلاحية تعديل المحتوى. أعد تسجيل الدخول.",
    };
  if (code === "22023")
    return {
      ok: false as const,
      message:
        "راجع اكتمال البيانات. روابط الترجمات الموجودة ثابتة ولا يمكن تغييرها.",
    };
  return {
    ok: false as const,
    message: "تعذر تنفيذ العملية. احتفظ بتعديلاتك وحاول مجددًا.",
  };
}
function refreshContent() {
  revalidatePath("/ar", "layout");
  revalidatePath("/en", "layout");
  revalidatePath("/admin/content");
}
export async function saveContent(input: unknown): Promise<ContentResult> {
  await requireAdmin();
  const parsed = saveContentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "راجع الحقول المطلوبة قبل الحفظ.",
      fields: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  const entry = parsed.data;
  if (entry.kind === "article") {
    entry.category = {
      ar: entry.category.ar || entry.category.en,
      en: entry.category.en || entry.category.ar,
    };
  }
  try {
    const client = await createAuthClient();
    const { data, error } = await client.rpc("save_site_entry", { entry });
    if (error) return failure(error.code);
    if (typeof data !== "string") return failure();
    refreshContent();
    return { ok: true, entry: { ...entry, updated_at: data } };
  } catch {
    return failure();
  }
}
export async function deleteContent(
  input: unknown,
): Promise<{ ok: true } | { ok: false; message: string; conflict?: boolean }> {
  await requireAdmin();
  const parsed = deleteContentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "بيانات الحذف غير صحيحة." };
  try {
    const client = await createAuthClient();
    const { kind, id, updated_at } = parsed.data;
    const { error } = await client.rpc("delete_site_entry", {
      entry_kind: kind,
      entry_id: id,
      expected_version: updated_at,
    });
    if (error) return failure(error.code);
    refreshContent();
    return { ok: true };
  } catch {
    return failure();
  }
}
