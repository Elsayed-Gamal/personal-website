import "server-only";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { getSiteContent, getSiteUI } from "@/lib/db/content";
import { buildSeoMetadata } from "@/lib/seo";

export async function getPageMetadata(
  language: string,
  page: "home" | "about" | "contact" | "work" | "blog",
) {
  if (!isLocale(language)) notFound();
  const ui = await getSiteUI(language);
  if (page === "home") {
    return buildSeoMetadata(ui, language, { path: `/${language}` });
  }
  const copy = await getSiteContent(page, language);
  return buildSeoMetadata(ui, language, {
    path: `/${language}/${page}`,
    title: copy.eyebrow,
    description: "intro" in copy ? copy.intro : copy.text,
  });
}
