"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { messageMutationSchema, type InboxMessage } from "@/lib/contact";
export type MessageResult =
  { ok: true; readAt?: string | null } | { ok: false; message: string };
const stale = {
  ok: false as const,
  message: "تغيرت الرسالة أو حُذفت من نافذة أخرى. حدّث القائمة وحاول مجددًا.",
};
export async function setMessageRead(input: unknown): Promise<MessageResult> {
  await requireAdmin();
  const parsed = messageMutationSchema
    .extend({ read: z.boolean() })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "بيانات الرسالة غير صحيحة." };
  try {
    const { id, expectedReadAt, read } = parsed.data;
    const client = await createAuthClient();
    const readAt = read ? new Date().toISOString() : null;
    let query = client
      .from("messages")
      .update({ read_at: readAt })
      .eq("id", id);
    query =
      expectedReadAt === null
        ? query.is("read_at", null)
        : query.eq("read_at", expectedReadAt);
    const { data, error } = await query.select("read_at").maybeSingle();
    if (error) return { ok: false, message: "تعذر تحديث حالة الرسالة." };
    if (!data) return stale;
    revalidatePath("/admin/messages");
    return { ok: true, readAt: data.read_at as InboxMessage["read_at"] };
  } catch {
    return { ok: false, message: "تعذر الاتصال. حاول مجددًا." };
  }
}
export async function deleteMessage(input: unknown): Promise<MessageResult> {
  await requireAdmin();
  const parsed = messageMutationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "بيانات الرسالة غير صحيحة." };
  try {
    const client = await createAuthClient();
    const { id, expectedReadAt } = parsed.data;
    let query = client.from("messages").delete().eq("id", id);
    query =
      expectedReadAt === null
        ? query.is("read_at", null)
        : query.eq("read_at", expectedReadAt);
    const { data, error } = await query.select("id").maybeSingle();
    if (error) return { ok: false, message: "تعذر حذف الرسالة." };
    if (!data) return stale;
    revalidatePath("/admin/messages");
    return { ok: true };
  } catch {
    return { ok: false, message: "تعذر الاتصال. حاول مجددًا." };
  }
}
