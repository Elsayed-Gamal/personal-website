import { AdminHeading } from "@/components/admin/page-heading";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { getAdminSettings } from "@/lib/db/admin-settings";

export default async function SettingsPage() {
  const records = await getAdminSettings();
  return (
    <>
      <AdminHeading
        title="إعدادات الموقع"
        description="حدّث هوية موقعك وإعدادات SEO ومحتوى الرئيسية ومن أنا وتواصل بالعربية والإنجليزية."
      />
      <SettingsEditor records={records} />
    </>
  );
}
