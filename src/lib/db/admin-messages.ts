import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { inboxMessageSchema } from "@/lib/contact";
import {
  messageQuerySchema,
  messagePageSchema,
  ADMIN_PAGE_SIZE,
  type MessageQuery,
} from "@/lib/admin/pagination";
export async function getAdminMessages(
  input: MessageQuery = { page: 1, search: "", filter: "all" },
) {
  await requireAdmin();
  const query = messageQuerySchema.parse(input);
  const client = await createAuthClient();
  const { data, error } = await client.rpc("list_admin_messages", {
    p_page: query.page,
    p_size: ADMIN_PAGE_SIZE,
    p_filter: query.filter,
    p_search: query.search,
  });
  if (error) throw new Error("تعذر تحميل الرسائل.");
  return messagePageSchema.parse(data);
}
export async function getAdminUnreadMessageCount() {
  await requireAdmin();
  const client = await createAuthClient();
  const { count, error } = await client
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error("تعذر تحميل عدد الرسائل غير المقروءة.");
  return count ?? 0;
}
export async function getAdminMessage(id: string) {
  await requireAdmin();
  const client = await createAuthClient();
  const { data, error } = await client
    .from("messages")
    .select("id,name,email,message,locale,read_at,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("تعذر تحميل الرسالة.");
  return data ? inboxMessageSchema.parse(data) : null;
}
