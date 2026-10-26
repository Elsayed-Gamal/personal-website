"use server";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import {
  saveSettingsSchema,
  type SaveSettingsResult,
} from "@/lib/admin/settings";

export async function saveSettings(
  input: unknown,
): Promise<SaveSettingsResult> {
  await requireAdmin();
  const parsed = saveSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "راجع الحقول المحددة قبل الحفظ.",
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join("."),
          issue.message,
        ]),
      ),
    };
  }
  const { key, locale, value, version } = parsed.data;
  try {
    const client = await createAuthClient();
    const { data, error } = await client
      .from("site_content")
      .update({ value })
      .eq("key", key)
      .eq("locale", locale)
      .eq("updated_at", version)
      .select("updated_at")
      .maybeSingle();
    if (error)
      return { ok: false, message: "تعذر حفظ التغييرات. حاول مرة أخرى." };
    if (!data)
      return {
        ok: false,
        conflict: true,
        message:
          "تغير المحتوى منذ فتح الصفحة أو لم تعد لديك صلاحية التعديل. أعد تحميل النسخة الحالية قبل الحفظ.",
      };
    updateTag("public-content");
    revalidatePath("/" + locale, "layout");
    revalidatePath("/admin/settings");
    return {
      ok: true,
      record: { key, locale, value, updated_at: data.updated_at },
    };
  } catch {
    return {
      ok: false,
      message: "تعذر الاتصال. احتفظ بتعديلاتك وحاول مرة أخرى.",
    };
  }
}
