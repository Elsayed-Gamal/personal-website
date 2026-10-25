import type { ArticleEdit, ProjectEdit } from "../../src/lib/admin/content";
export const article: ArticleEdit = {
  kind: "article",
  cover_image_path: null,
  cover_image_alt: { ar: "", en: "" },
  id: "article-test",
  updated_at: "2026-10-24T00:00:00Z",
  published: true,
  date: "2026-10-24",
  reading_time: 5,
  category: { ar: "تطوير", en: "Development" },
  translations: [
    {
      locale: "ar",
      slug: "article-ar",
      title: "مقال للتجربة",
      excerpt: "ملخص",
      body: "# عنوان\nمحتوى المقال",
      published: true,
    },
  ],
};
export const project: ProjectEdit = {
  kind: "project",
  cover_image_path: null,
  cover_image_alt: { ar: "", en: "" },
  id: "project-test",
  updated_at: "2026-10-24T00:00:00Z",
  published: false,
  year: "2026",
  sort_order: 1,
  color: "cyan",
  stack: ["Next.js"],
  translations: [
    {
      locale: "ar",
      title: "مشروع للتجربة",
      summary: "ملخص",
      body: "تفاصيل",
      category: "ويب",
    },
    {
      locale: "en",
      title: "Test project",
      summary: "Summary",
      body: "Details",
      category: "Web",
    },
  ],
};
