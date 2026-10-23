import { requireAdmin } from "@/lib/auth/admin";
import {
  AdminHeading,
  AdminPlaceholder,
} from "@/components/admin/page-heading";
export default async function SettingsPage() {
  await requireAdmin();
  return (
    <>
      <AdminHeading
        title="إعدادات الموقع"
        description="تحكم في هوية موقعك والنصوص التي تستقبل زواره."
      />
      <div className="admin-grid admin-grid-two">
        <AdminPlaceholder
          title="محتوى الصفحة الرئيسية"
          description="تحرير المقدمة والخدمات ومراحل العمل وأقسام الأعمال والمقالات والدعوة للتواصل بالعربية والإنجليزية."
        />
        <AdminPlaceholder
          title="الهوية والإعدادات العامة"
          description="تحديث اسم الموقع ووصفك المهني ونصوص التنقل والتذييل."
        />
      </div>
    </>
  );
}
