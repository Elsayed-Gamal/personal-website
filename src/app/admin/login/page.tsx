import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth/admin";
import { LoginForm } from "@/components/admin/login-form";
export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin/dashboard");
  return (
    <main className="admin-login">
      <section className="admin-login-card">
        <span className="admin-icon">
          <LockKeyhole aria-hidden="true" />
        </span>
        <p className="admin-eyebrow">مساحة الإدارة</p>
        <h1>أهلًا بعودتك</h1>
        <p className="admin-muted">
          سجّل الدخول بحسابك المصرح له لإدارة الموقع.
        </p>
        <LoginForm />
        <Link className="admin-back" href="/ar">
          العودة للموقع
        </Link>
      </section>
    </main>
  );
}
