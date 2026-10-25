import type { Metadata } from "next";
import { z } from "zod";
import type { Locale, SiteUI } from "@/lib/content";

const webUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "أدخل رابطًا كاملًا يبدأ بـ https:// أو http://.");

export const seoSchema = z.object({
  title: z.string().trim().max(120, "الحد الأقصى 120 حرفًا."),
  description: z.string().trim().max(320, "الحد الأقصى 320 حرفًا."),
  siteUrl: webUrl.refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.pathname === "/" && !url.search && !url.hash;
    } catch {
      return false;
    }
  }, "أدخل رابط الموقع الأساسي فقط، دون مسار صفحة أو معاملات."),
  imageUrl: webUrl,
  imageAlt: z.string().trim().max(200),
  twitterHandle: z
    .string()
    .trim()
    .regex(
      /^(@[A-Za-z0-9_]{1,15})?$/,
      "أدخل اسم الحساب بصيغة @username أو اتركه فارغًا.",
    ),
});

export const emptySeo: z.infer<typeof seoSchema> = {
  title: "",
  description: "",
  siteUrl: "",
  imageUrl: "",
  imageAlt: "",
  twitterHandle: "",
};

export function buildSeoMetadata(
  ui: SiteUI,
  locale: Locale,
  page: {
    title?: string;
    description?: string;
    path?: string;
    article?: boolean;
    imageUrl?: string;
    imageAlt?: string;
  } = {},
): Metadata {
  const seo = ui.seo ?? emptySeo;
  const siteTitle = seo.title || `${ui.brandName} — ${ui.brandRole}`;
  const title = page.title ? `${page.title} — ${siteTitle}` : siteTitle;
  const description = page.description || seo.description || ui.footer;
  const url =
    seo.siteUrl && page.path ? new URL(page.path, seo.siteUrl).href : undefined;
  const imageUrl = page.imageUrl || seo.imageUrl;
  const images = imageUrl
    ? [
        {
          url: imageUrl,
          alt: page.imageUrl
            ? page.imageAlt || title
            : seo.imageAlt || siteTitle,
        },
      ]
    : undefined;
  return {
    title: { absolute: title },
    description,
    ...(seo.siteUrl ? { metadataBase: new URL(seo.siteUrl) } : {}),
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      type: page.article ? "article" : "website",
      siteName: ui.brandName,
      title,
      description,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      ...(url ? { url } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images } : {}),
      ...(seo.twitterHandle ? { creator: seo.twitterHandle } : {}),
    },
  };
}
