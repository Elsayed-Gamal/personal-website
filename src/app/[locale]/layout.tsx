import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { isLocale } from "@/lib/content";
import { getSiteUI } from "@/lib/db/content";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { analyticsEnabled } from "@/lib/analytics";
import { buildSeoMetadata } from "@/lib/seo";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@/styles/globals.css";

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ui = await getSiteUI(locale);
  return {
    ...buildSeoMetadata(ui, locale),
    icons: {
      icon: { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      shortcut: "/favicon.svg",
    },
  };
}

export const revalidate = 300;
export function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

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
