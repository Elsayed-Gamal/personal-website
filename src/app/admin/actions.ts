"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/auth/admin-access";

export type LoginState = { error: string };
export async function login(
  _: LoginState,
  form: FormData,
): Promise<LoginState> {
  const parsed = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success)
    return { error: "أدخل بريدًا إلكترونيًا صحيحًا وكلمة المرور." };
  try {
    const client = await createAuthClient();
    const { data, error } = await client.auth.signInWithPassword(parsed.data);
    if (error || !isAdminUser(data.user)) {
      if (data.session) await client.auth.signOut({ scope: "local" });
      return {
        error: "تعذر تسجيل الدخول. تحقق من بيانات الحساب وصلاحية الوصول.",
      };
    }
  } catch {
    return { error: "تعذر الاتصال الآن. حاول مرة أخرى بعد قليل." };
  }
  redirect("/admin/dashboard");
}

export async function logout() {
  const client = await createAuthClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw new Error("تعذر تسجيل الخروج. حاول مرة أخرى.");
  redirect("/admin/login");
}
