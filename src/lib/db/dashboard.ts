import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { dashboardSchema } from "@/lib/analytics";
export async function getDashboard(days: 7 | 30 | 90) {
  await requireAdmin();
  const client = await createAuthClient();
  const { data, error } = await client.rpc("get_dashboard", { p_days: days });
  if (error) throw new Error("تعذر تحميل لوحة التحكم. حاول مجددًا.");
  return dashboardSchema.parse(data);
}
