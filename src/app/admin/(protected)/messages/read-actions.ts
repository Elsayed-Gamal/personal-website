"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminMessages, getAdminMessage } from "@/lib/db/admin-messages";
import {
  messageQuerySchema,
  type PageResult,
  type MessagePage,
} from "@/lib/admin/pagination";
import type { InboxMessage } from "@/lib/contact";
export async function loadMessagePage(
  input: unknown,
): Promise<PageResult<MessagePage>> {
  await requireAdmin();
  const parsed = messageQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "خيارات البحث غير صحيحة." };
  try {
    return { ok: true, page: await getAdminMessages(parsed.data) };
  } catch {
    return { ok: false, message: "تعذر تحميل الرسائل." };
  }
}
export async function loadMessage(
  id: unknown,
): Promise<{ ok: true; message: InboxMessage } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "معرّف الرسالة غير صحيح." };
  try {
    const message = await getAdminMessage(parsed.data);
    return message
      ? { ok: true, message }
      : { ok: false, error: "الرسالة غير موجودة." };
  } catch {
    return { ok: false, error: "تعذر تحميل الرسالة." };
  }
}
