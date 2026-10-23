import { requireAdmin } from "@/lib/auth/admin";
import {
  AdminHeading,
  AdminPlaceholder,
} from "@/components/admin/page-heading";
export default async function ContentPage() {
  await requireAdmin();
  return (
    <>
      <AdminHeading
        title="إدارة المحتوى"
        description="مقالاتك وأعمالك في مساحة واحدة، مع دعم العربية والإنجليزية."
      />
      <div className="admin-grid admin-grid-two">
        <AdminPlaceholder
          title="المقالات"
          description="إضافة وتحرير المقالات، إدارة المسودات والنشر، وإضافة ترجمة ثانية عند الحاجة."
        />
        <AdminPlaceholder
          title="المشاريع"
          description="إضافة أعمالك، تحرير تفاصيلها وترتيب ظهورها في معرض الأعمال."
        />
      </div>
    </>
  );
}
