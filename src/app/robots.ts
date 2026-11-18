import type { MetadataRoute } from "next";
import { getCrawlerSiteUrl } from "@/lib/db/sitemap";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getCrawlerSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
