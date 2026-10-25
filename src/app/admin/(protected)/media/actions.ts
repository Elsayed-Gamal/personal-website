"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { getMediaPage } from "@/lib/db/media";
import { mediaQuerySchema, type MediaResult } from "@/lib/admin/media";
import { CONTENT_IMAGES_BUCKET, imagePathSchema } from "@/lib/content-images";

export async function loadMedia(input: unknown): Promise<MediaResult> {
  await requireAdmin();
  const parsed = mediaQuerySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "خيارات عرض الصور غير صحيحة." };
  try {
    return { ok: true, page: await getMediaPage(parsed.data) };
  } catch {
    return { ok: false, message: "تعذر تحميل مكتبة الصور. حاول مجددًا." };
  }
}

export async function deleteMedia(
  input: unknown,
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const parsed = imagePathSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "مسار الصورة غير صالح." };
  try {
    const client = await createAuthClient();
    // Reserve before Storage deletion so concurrent saves cannot reuse this file.
    const { error: reservationError } = await client.rpc(
      "prepare_content_image_deletion",
      { image_path: parsed.data },
    );
    if (reservationError)
      return {
        ok: false,
        message:
          reservationError.code === "23503"
            ? "الصورة مستخدمة في المحتوى أو إعدادات الموقع. أزل ارتباطها ثم حاول مجددًا."
            : "تعذر حذف الصورة. تحقق من صلاحياتك وأعد المحاولة.",
      };
    const { data, error } = await client.storage
      .from(CONTENT_IMAGES_BUCKET)
      .remove([parsed.data]);
    if (error || !data?.some((file) => file.name === parsed.data))
      return {
        ok: false,
        message:
          "لم يتأكد حذف الصورة. حدّث المكتبة وأعد محاولة الحذف؛ الصورة غير متاحة للاختيار أثناء ذلك.",
      };
    revalidatePath("/admin/media");
    return { ok: true, message: "تم حذف الصورة نهائيًا من التخزين." };
  } catch {
    return {
      ok: false,
      message: "تعذر تأكيد الحذف. حدّث المكتبة وأعد المحاولة.",
    };
  }
}
