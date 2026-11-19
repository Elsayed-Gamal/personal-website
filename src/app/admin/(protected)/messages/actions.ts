"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { ADMIN_PAGE_SIZE } from "@/lib/admin/pagination";
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
    revalidatePath("/admin/dashboard");
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
    revalidatePath("/admin/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, message: "تعذر الاتصال. حاول مجددًا." };
  }
}

export async function deleteMessages(
  input: unknown,
): Promise<
  | { ok: true; deleted: { id: string; read_at: string | null }[] }
  | { ok: false; message: string }
> {
  await requireAdmin();
  const parsed = z.array(z.uuid()).min(1).max(ADMIN_PAGE_SIZE).safeParse(input);
  if (!parsed.success) return { ok: false, message: "تحديد الرسائل غير صالح." };

  try {
    const client = await createAuthClient();
    const { data, error } = await client
      .from("messages")
      .delete()
      .in("id", [...new Set(parsed.data)])
      .select("id,read_at");
    if (error) return { ok: false, message: "تعذر حذف الرسائل." };
    revalidatePath("/admin/messages");
    revalidatePath("/admin/dashboard");
    return { ok: true, deleted: data ?? [] };
  } catch {
    return { ok: false, message: "تعذر الاتصال. حاول مجددًا." };
  }
}

export type AllMessagesSelection = { through: string; count: number };

export async function selectAllMessages(): Promise<
  { ok: true; selection: AllMessagesSelection } | { ok: false; message: string }
> {
  await requireAdmin();
  try {
    const through = new Date().toISOString();
    const client = await createAuthClient();
    const { count, error } = await client
      .from("messages")
      .select("id", { count: "exact", head: true })
      .lte("created_at", through);
    if (error || count === null)
      return { ok: false, message: "تعذر تحديد كل الرسائل." };
    return { ok: true, selection: { through, count } };
  } catch {
    return { ok: false, message: "تعذر الاتصال. حاول مجددًا." };
  }
}

export async function deleteAllSelectedMessages(
  through: unknown,
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  await requireAdmin();
  const cutoff = z.iso.datetime().safeParse(through);
  if (!cutoff.success || Date.parse(cutoff.data) > Date.now())
    return { ok: false, message: "تحديد الرسائل غير صالح." };

  try {
    const client = await createAuthClient();
    const { count, error } = await client
      .from("messages")
      .delete({ count: "exact" })
      .lte("created_at", cutoff.data);
    if (error || count === null)
      return { ok: false, message: "تعذر حذف الرسائل." };
    revalidatePath("/admin", "layout");
    return { ok: true, count };
  } catch {
    return { ok: false, message: "تعذر الاتصال. حاول مجددًا." };
  }
}
