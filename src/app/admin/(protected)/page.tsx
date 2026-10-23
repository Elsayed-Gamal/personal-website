import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
export default async function AdminPage() {
  await requireAdmin();
  redirect("/admin/dashboard");
}
