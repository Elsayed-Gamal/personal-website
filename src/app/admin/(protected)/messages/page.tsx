import { requireAdmin } from "@/lib/auth/admin";
import {
  AdminHeading,
  AdminPlaceholder,
} from "@/components/admin/page-heading";
export default async function MessagesPage() {
  await requireAdmin();
  return (
    <>
      <AdminHeading
        title="الرسائل"
        description="مساحة لمتابعة استفسارات العملاء وفرص التعاون."
      />
      <AdminPlaceholder
        title="صندوق الوارد"
        description="سيُربط هذا القسم برسائل نموذج التواصل، مع عرض تفاصيل الرسالة وحالة قراءتها."
      />
    </>
  );
}
