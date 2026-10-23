import Link from "next/link";
import { ArrowUpLeft, Files, Mail, Settings } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import {
  AdminHeading,
  AdminPlaceholder,
} from "@/components/admin/page-heading";
export default async function DashboardPage() {
  await requireAdmin();
  return (
    <>
      <AdminHeading
        title="لوحة التحكم"
        description="كل ما تحتاجه لإدارة حضورك على الإنترنت، في مكان واحد."
      />
      <div className="admin-welcome">
        <div>
          <span>مساحة مرتّبة لأفكارك</span>
          <h2>موقعك يبدأ من هنا.</h2>
          <p>انشر أعمالك، شارك خبراتك، واجعل محتوى موقعك يعبر عنك.</p>
        </div>
        <span className="admin-welcome-mark" aria-hidden="true">
          EG
        </span>
      </div>
      <div className="admin-grid">
        {[
          {
            href: "/admin/content",
            title: "المقالات والمشاريع",
            text: "مساحة إدارة المحتوى والنشر والترجمات.",
            icon: Files,
          },
          {
            href: "/admin/messages",
            title: "رسائل التواصل",
            text: "مساحة متابعة استفسارات العملاء.",
            icon: Mail,
          },
          {
            href: "/admin/settings",
            title: "إعدادات الموقع",
            text: "الهوية ومحتوى الصفحة الرئيسية.",
            icon: Settings,
          },
        ].map(({ href, title, text, icon: Icon }) => (
          <Link href={href} key={href} className="admin-panel admin-card-link">
            <span className="admin-icon">
              <Icon aria-hidden="true" />
            </span>
            <h2>{title}</h2>
            <p className="admin-muted">{text}</p>
            <ArrowUpLeft size={20} aria-hidden="true" />
          </Link>
        ))}
      </div>
      <AdminPlaceholder
        title="نظرة على أداء الموقع"
        description="ستظهر إحصاءات الزيارات ومصادرها هنا بعد تفعيل جمع بيانات التحليلات."
      />
    </>
  );
}
