import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { emptySeo } from "@/lib/seo";
import { siteUISchema } from "@/lib/content";
import {
  settingsKeySchema,
  settingsValueSchemas,
  type SettingsRecord,
} from "@/lib/admin/settings";

export async function getAdminSettings(): Promise<SettingsRecord[]> {
  await requireAdmin();
  const client = await createAuthClient();
  const { data, error } = await client
    .from("site_content")
    .select("key,locale,value,updated_at")
    .in("key", ["ui", "home"])
    .order("key")
    .order("locale");
  if (error) throw new Error("تعذر تحميل إعدادات الموقع.");
  const rows = z
    .array(
      z.object({
        key: settingsKeySchema,
        locale: z.enum(["ar", "en"]),
        value: z.unknown(),
        updated_at: z.string(),
      }),
    )
    .parse(data);
  if (rows.length !== 4)
    throw new Error("بعض إعدادات الموقع أو ترجماتها غير موجودة.");
  return rows.map((row) => {
    if (row.key === "ui") {
      const value = siteUISchema.parse(row.value);
      return { ...row, value: { ...value, seo: value.seo ?? { ...emptySeo } } };
    }
    return { ...row, value: settingsValueSchemas[row.key].parse(row.value) };
  });
}
