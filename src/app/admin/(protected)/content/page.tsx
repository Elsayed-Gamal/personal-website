import { AdminHeading } from "@/components/admin/page-heading";
import { ContentManager } from "@/components/admin/content-manager";
import { getAdminContent } from "@/lib/db/admin-content";
export default async function ContentPage() {
  const entries = await getAdminContent();
  return (
    <>
      <AdminHeading
        title="إدارة المحتوى"
        description="أضف أعمالك وشارك أفكارك، وتحكم في المسودات والنشر والترجمات."
      />
      <ContentManager initialEntries={entries} />
    </>
  );
}
