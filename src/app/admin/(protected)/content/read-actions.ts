"use server";
import { getAdminContent } from "@/lib/db/admin-content";
import {
  contentQuerySchema,
  type PageResult,
  type ContentPage,
} from "@/lib/admin/pagination";

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

export async function loadContentPage(
  input: unknown,
): Promise<PageResult<ContentPage>> {
  await requireAdmin();
  const parsed = contentQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "خيارات البحث غير صحيحة." };
  try {
    return { ok: true, page: await getAdminContent(parsed.data) };
  } catch {
    return { ok: false, message: "تعذر تحميل المحتوى." };
  }
}
