import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { isLocale } from "@/lib/content";
import { getSiteUI } from "@/lib/db/content";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { analyticsEnabled } from "@/lib/analytics";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "Full-stack Developer",
    template: "%s — Full-stack Developer",
  },
  description:
    "A bilingual portfolio and technical journal by an independent full-stack developer.",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    shortcut: "/favicon.svg",
  },
};

export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getSiteUI(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
    >
      <body>
        <PageViewTracker enabled={analyticsEnabled()} />
        <SiteHeader locale={locale} t={t} />
        <main>{children}</main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
