import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { inboxMessageSchema, type InboxMessage } from "@/lib/contact";
export async function getAdminMessages(): Promise<InboxMessage[]> {
  await requireAdmin();
  const client = await createAuthClient();
  const messages: InboxMessage[] = [];
  for (let start = 0; ; start += 100) {
    const { data, error } = await client
      .from("messages")
      .select("id,name,email,message,locale,read_at,created_at")
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + 99);
    if (error) throw new Error("تعذر تحميل الرسائل.");
    messages.push(...inboxMessageSchema.array().parse(data));
    if (data.length < 100) return messages;
  }
}
