import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@/styles/globals.css";
import "@/styles/admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "إدارة الموقع", template: "%s | إدارة الموقع" },
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "/favicon.svg" },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="admin-body">{children}</body>
    </html>
  );
}
