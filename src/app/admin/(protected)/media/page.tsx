import { AdminHeading } from "@/components/admin/page-heading";
import { MediaLibrary } from "@/components/admin/media-library";
import { getMediaPage } from "@/lib/db/media";

export default async function MediaPage() {
  const page = await getMediaPage({ page: 0, folder: "all" });
  return (
    <>
      <AdminHeading
        title="مكتبة الصور"
        description="استعرض صور المقالات والمشاريع، وانسخ روابطها أو احذف الصور غير المستخدمة."
      />
      <MediaLibrary initialPage={page} />
    </>
  );
}
