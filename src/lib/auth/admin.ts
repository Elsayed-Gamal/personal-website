import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "./admin-access";
import { measureAdminOperation } from "@/lib/admin/performance";

export const getAdmin = cache(async () => {
  const client = await createAuthClient();
  const { data, error } = await measureAdminOperation("server.auth", () =>
    client.auth.getUser(),
  );
  return !error && isAdminUser(data.user) ? data.user : null;
});

// Also call from every protected loader and future mutation, not just layouts.
export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) redirect("/admin/login");
  return user;
}
