import { z } from "zod";
import { coverImageFields } from "@/lib/content-images";
const short = z.string().trim().max(200, "الحد الأقصى 200 حرف.");
const text = z.string().trim().max(2000, "الحد الأقصى 2000 حرف.");
const body = z.string().max(80000, "الحد الأقصى 80000 حرف.");
export const contentSlug = z
  .string()
  .trim()
  .min(1, "أدخل رابطًا.")
  .max(180)
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{M}\p{N}_-]*$/u,
    "استخدم حروفًا وأرقامًا وشرطة فقط، بدون مسافات.",
  );
const locale = z.enum(["ar", "en"]);
const version = z.string().datetime({ offset: true }).nullable();
const base = {
  id: contentSlug,
  updated_at: version,
  published: z.boolean(),
  ...coverImageFields,
};
export const articleEditSchema = z.object({
  kind: z.literal("article"),
  ...base,
  date: z.iso.date(),
  reading_time: z.number().int().min(1).max(999),
  category: z.object({ ar: short, en: short }),
  translations: z
    .array(
      z.object({
        locale,
        slug: contentSlug,
        title: short.min(1, "أدخل عنوان المقال."),
        excerpt: text,
        body,
        published: z.boolean(),
      }),
    )
    .min(1)
    .max(2),
});
export const projectEditSchema = z.object({
  kind: z.literal("project"),
  ...base,
  sort_order: z.number().int().min(0).max(99999),
  year: z.string().regex(/^\d{4}$/, "أدخل سنة من أربعة أرقام."),
  color: z.enum(["cyan", "violet", "amber"]),
  stack: z.array(z.string().trim().min(1).max(60)).max(30),
  translations: z
    .array(
      z.object({ locale, title: short, summary: text, body, category: short }),
    )
    .min(1)
    .max(2),
});
export const contentEntrySchema = z.discriminatedUnion("kind", [
  articleEditSchema,
  projectEditSchema,
]);
export type ContentEntry = z.infer<typeof contentEntrySchema>;
export type ArticleEdit = z.infer<typeof articleEditSchema>;
export type ProjectEdit = z.infer<typeof projectEditSchema>;
export type ContentKind = ContentEntry["kind"];
export const contentIdentitySchema = z.object({
  kind: z.enum(["article", "project"]),
  id: contentSlug,
});
// Lists never carry editable bodies. A complete entry is fetched on edit.
export const contentSummarySchema = z.discriminatedUnion("kind", [
  articleEditSchema
    .pick({
      kind: true,
      id: true,
      updated_at: true,
      published: true,
      date: true,
    })
    .extend({
      translations: z.array(
        articleEditSchema.shape.translations.element.pick({
          locale: true,
          slug: true,
          title: true,
          published: true,
        }),
      ),
    }),
  projectEditSchema
    .pick({
      kind: true,
      id: true,
      updated_at: true,
      published: true,
      year: true,
      sort_order: true,
    })
    .extend({
      translations: z.array(
        projectEditSchema.shape.translations.element.pick({
          locale: true,
          title: true,
        }),
      ),
    }),
]);
export type ContentSummary = z.infer<typeof contentSummarySchema>;
export const saveContentSchema = contentEntrySchema.superRefine(
  (entry, ctx) => {
    const error = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (
      entry.cover_image_path &&
      !entry.cover_image_path.startsWith(
        entry.kind === "article" ? "articles/" : "projects/",
      )
    )
      error(["cover_image_path"], "ارفع الصورة من محرر هذا النوع من المحتوى.");
    if (
      new Set(entry.translations.map((t) => t.locale)).size !==
      entry.translations.length
    )
      error(["translations"], "لا يمكن تكرار اللغة.");
    if (entry.kind === "article") {
      if (
        new Set(entry.translations.map((t) => t.slug)).size !==
        entry.translations.length
      )
        error(["translations"], "كل ترجمة تحتاج رابطًا مختلفًا.");
      if (!entry.category.ar && !entry.category.en)
        error(["category"], "أدخل تصنيفًا بلغة واحدة على الأقل.");
      if (entry.published && !entry.translations.some((t) => t.published))
        error(["translations"], "فعّل نشر ترجمة واحدة على الأقل.");
      entry.translations.forEach((t, i) => {
        if (entry.published && t.published)
          for (const field of ["title", "excerpt", "body"] as const) {
            if (!t[field].trim())
              error(["translations", i, field], "هذا الحقل مطلوب للنشر.");
          }
      });
    } else {
      if (!entry.translations.some((t) => t.title))
        error(["translations"], "أدخل عنوان المشروع بلغة واحدة على الأقل.");
      if (entry.published) {
        if (entry.translations.length !== 2)
          error(["translations"], "نشر المشروع يحتاج العربية والإنجليزية.");
        if (!entry.stack.length) error(["stack"], "أضف تقنية واحدة على الأقل.");
        entry.translations.forEach((t, i) => {
          for (const field of ["title", "summary", "body", "category"] as const)
            if (!t[field].trim())
              error(
                ["translations", i, field],
                "أكمل بيانات اللغتين قبل نشر المشروع.",
              );
        });
      }
    }
  },
);
export const deleteContentSchema = z.object({
  kind: z.enum(["article", "project"]),
  id: contentSlug,
  updated_at: z.string().datetime({ offset: true }),
});
export type ContentResult =
  | { ok: true; entry: ContentEntry }
  | {
      ok: false;
      message: string;
      conflict?: boolean;
      fields?: Record<string, string>;
    };
export function entryTitle(entry: ContentEntry | ContentSummary) {
  return (
    entry.translations.find((t) => t.locale === "ar" && t.title)?.title ||
    entry.translations.find((t) => t.title)?.title ||
    "بدون عنوان"
  );
}
export function newContentEntry(kind: ContentKind): ContentEntry {
  if (kind === "article")
    return {
      kind,
      id: crypto.randomUUID(),
      cover_image_path: null,
      cover_image_alt: { ar: "", en: "" },
      updated_at: null,
      published: false,
      date: new Date().toLocaleDateString("en-CA", {
        timeZone: "Africa/Cairo",
      }),
      reading_time: 5,
      category: { ar: "", en: "" },
      translations: [
        {
          locale: "ar",
          slug: "",
          title: "",
          excerpt: "",
          body: "",
          published: true,
        },
      ],
    };
  return {
    kind,
    id: "",
    cover_image_path: null,
    cover_image_alt: { ar: "", en: "" },
    updated_at: null,
    published: false,
    year: String(new Date().getFullYear()),
    sort_order: 0,
    color: "cyan",
    stack: [],
    translations: (["ar", "en"] as const).map((locale) => ({
      locale,
      title: "",
      summary: "",
      body: "",
      category: "",
    })),
  };
}
