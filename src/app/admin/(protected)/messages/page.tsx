import { AdminHeading } from "@/components/admin/page-heading";
import { MessageInbox } from "@/components/admin/message-inbox";
import { getAdminMessages } from "@/lib/db/admin-messages";
export default async function MessagesPage() {
  const messages = await getAdminMessages();
  return (
    <>
      <AdminHeading
        title="الرسائل"
        description="تابع استفسارات العملاء ورسائل التواصل الواردة من الموقع."
      />
      <MessageInbox initialPage={messages} />
    </>
  );
}
