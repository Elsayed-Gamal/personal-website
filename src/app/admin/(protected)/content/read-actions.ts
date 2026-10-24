"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { contentIdentitySchema, type ContentResult } from "@/lib/admin/content";
import { getAdminContentEntry } from "@/lib/db/admin-content";

export async function loadContent(input: unknown): Promise<ContentResult> {
  await requireAdmin();
  const parsed = contentIdentitySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "بيانات المحتوى غير صحيحة." };
  try {
    const entry = await getAdminContentEntry(parsed.data.kind, parsed.data.id);
    return entry
      ? { ok: true, entry }
      : { ok: false, message: "المحتوى لم يعد موجودًا. حدّث الصفحة." };
  } catch {
    return { ok: false, message: "تعذر تحميل المحتوى. حاول مرة أخرى." };
  }
}
