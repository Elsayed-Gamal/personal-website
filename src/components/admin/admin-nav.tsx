"use client";
import { useEffect, useState } from "react";
import { AdminLink as Link } from "./admin-link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Files, Mail, Settings, Images } from "lucide-react";
const items = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/content", label: "إدارة المحتوى", icon: Files },
  { href: "/admin/media", label: "مكتبة الصور", icon: Images },
  { href: "/admin/messages", label: "الرسائل", icon: Mail },
  { href: "/admin/settings", label: "إعدادات الموقع", icon: Settings },
];
export function AdminNav({
  unreadMessageCount: initialUnreadMessageCount,
}: {
  unreadMessageCount: number;
}) {
  const path = usePathname();
  const [unreadMessageCount, setUnreadMessageCount] = useState(
    initialUnreadMessageCount,
  );
  useEffect(() => {
    function updateUnreadCount(event: Event) {
      const delta = (event as CustomEvent<number>).detail;
      if (Number.isInteger(delta))
        setUnreadMessageCount((count) => Math.max(0, count + delta));
    }
    window.addEventListener("admin:unread-messages", updateUnreadCount);
    return () =>
      window.removeEventListener("admin:unread-messages", updateUnreadCount);
  }, []);
  return (
    <nav className="admin-nav" aria-label="أقسام الإدارة">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
        >
          <Icon size={20} aria-hidden="true" />
          <span>{label}</span>
          {href === "/admin/messages" && unreadMessageCount > 0 && (
            <span
              className="admin-nav-unread"
              role="status"
              aria-label={`عدد الرسائل غير المقروءة: ${unreadMessageCount}`}
            >
              {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
