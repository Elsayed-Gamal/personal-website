import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminLink } from "@/components/admin/admin-link";
import { logout } from "@/app/admin/actions";
import { getAdminUnreadMessageCount } from "@/lib/db/admin-messages";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, unreadMessageCount] = await Promise.all([
    requireAdmin(),
    getAdminUnreadMessageCount(),
  ]);
  return (
    <div className="admin-shell">
      <a href="#admin-main" className="admin-skip">
        انتقل إلى المحتوى
      </a>
      <aside className="admin-sidebar">
        <AdminLink className="admin-brand" href="/admin/dashboard">
          <span>EG</span>
          <div>
            إدارة الموقع<small>مساحتك الخاصة</small>
          </div>
        </AdminLink>
        <AdminNav
          key={unreadMessageCount}
          unreadMessageCount={unreadMessageCount}
        />
        <Link className="admin-site-link" href="/ar">
          <ExternalLink size={18} aria-hidden="true" /> عرض الموقع
        </Link>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span>مساحة عمل المسؤول</span>
          <div>
            <span className="admin-email" dir="ltr">
              {user.email}
            </span>
            <form action={logout}>
              <button className="admin-signout">
                <LogOut size={17} aria-hidden="true" /> خروج
              </button>
            </form>
          </div>
        </header>
        <main id="admin-main" className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}
