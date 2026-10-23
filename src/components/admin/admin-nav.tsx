"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Files, Mail, Settings } from "lucide-react";
const items = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/content", label: "إدارة المحتوى", icon: Files },
  { href: "/admin/messages", label: "الرسائل", icon: Mail },
  { href: "/admin/settings", label: "إعدادات الموقع", icon: Settings },
];
export function AdminNav() {
  const path = usePathname();
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
        </Link>
      ))}
    </nav>
  );
}
