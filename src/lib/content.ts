import { z } from "zod";
import { seoSchema } from "@/lib/seo";
import { coverImageFields } from "@/lib/content-images";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

const localizedText = z.object({ ar: z.string(), en: z.string() });
export const siteUISchema = z.object({
  seo: seoSchema.optional(),
  nav: z.object({
    home: z.string(),
    services: z.string(),
    work: z.string(),
    blog: z.string(),
    about: z.string(),
    contact: z.string(),
  }),
  availability: z.string(),
  footer: z.string(),
  footerSignature: z.string(),
  language: z.string(),
  brandName: z.string(),
  brandRole: z.string(),
  viewProject: z.string(),
  readArticle: z.string(),
  allWork: z.string(),
  allArticles: z.string(),
  minutes: z.string(),
  originalLanguage: z.string(),
});
export type SiteUI = z.infer<typeof siteUISchema>;

const serviceSchema = z.object({
  icon: z.enum(["globe", "layers", "shopping-bag"]),
  title: z.string(),
  text: z.string(),
  tag: z.string(),
});
const stepSchema = z.object({ title: z.string(), text: z.string() });
export const homeContentSchema = z.object({
  hero: z.object({
    label: z.string(),
    title: z.string(),
    accentTitle: z.string(),
    description: z.string(),
    primaryCta: z.string(),
    secondaryCta: z.string(),
    benefits: z.array(z.string()).length(3),
    detailTitle: z.string(),
    detailText: z.string(),
    cursorLabel: z.string(),
    artDescription: z.string(),
  }),
  services: z.object({
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    items: z.array(serviceSchema).length(3),
  }),
  work: z.object({
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    link: z.string(),
  }),
  process: z.object({
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    steps: z.array(stepSchema).length(4),
  }),
  journal: z.object({
    eyebrow: z.string(),
    title: z.string(),
    link: z.string(),
  }),
  cta: z.object({
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    button: z.string(),
  }),
});
export type HomeContent = z.infer<typeof homeContentSchema>;

const valueSchema = z.object({
  icon: z.enum(["compass", "gauge", "workflow", "code"]),
  title: z.string(),
  text: z.string(),
});
export const aboutContentSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  intro: z.string(),
  storyTitle: z.string(),
  story: z.string(),
  values: z.array(valueSchema).length(4),
  stackTitle: z.string(),
  stack: z.array(z.string()),
  cta: z.string(),
});
export const contactContentSchema = z.object({
  form: z.object({
    name: z.string(),
    email: z.string(),
    message: z.string(),
    submit: z.string(),
    sending: z.string(),
    success: z.string(),
    error: z.string(),
    invalid: z.string(),
    rateLimited: z.string(),
    privacy: z.string(),
    hint: z.string(),
    another: z.string(),
  }),
  eyebrow: z.string(),
  title: z.string(),
  intro: z.string(),
  promptsTitle: z.string(),
  prompts: z.array(z.string()).length(3),
  cardTitle: z.string(),
  cardText: z.string(),
  emailLabel: z.string(),
  workPrompt: z.string(),
  workLink: z.string(),
});
export const listingContentSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  text: z.string(),
});
export const projectDetailContentSchema = z.object({
  back: z.string(),
  overview: z.string(),
  role: z.string(),
  next: z.string(),
  note: z.string(),
});
export const articleDetailContentSchema = z.object({
  back: z.string(),
  note: z.string(),
  minutes: z.string(),
});

export const siteContentSchemas = {
  ui: siteUISchema,
  home: homeContentSchema,
  about: aboutContentSchema,
  contact: contactContentSchema,
  work: listingContentSchema,
  blog: listingContentSchema,
  project_detail: projectDetailContentSchema,
  article_detail: articleDetailContentSchema,
} as const;
export type SiteContentKey = keyof typeof siteContentSchemas;
export type SiteContentMap = {
  [K in SiteContentKey]: z.infer<(typeof siteContentSchemas)[K]>;
};

export const projectTranslationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  body: z.string(),
});
export type LocalizedText = Record<
  Locale,
  z.infer<typeof projectTranslationSchema>
>;
export const projectSchema = z.object({
  ...coverImageFields,
  slug: z.string().min(1),
  index: z.string(),
  year: z.string(),
  category: localizedText,
  color: z.enum(["cyan", "violet", "amber"]),
  stack: z.array(z.string()),
  content: z.object({
    ar: projectTranslationSchema,
    en: projectTranslationSchema,
  }),
});
export type Project = z.infer<typeof projectSchema>;
export const articleTranslationSchema = z.object({
  slug: z.string().min(1),
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
});
export const articleSchema = z.object({
  ...coverImageFields,
  id: z.string(),
  date: z.string(),
  readingTime: z.number().int().positive(),
  category: localizedText,
  translations: z
    .object({
      ar: articleTranslationSchema.optional(),
      en: articleTranslationSchema.optional(),
    })
    .refine(
      (value) => Boolean(value.ar || value.en),
      "An article must have a published translation",
    ),
});
export type Article = z.infer<typeof articleSchema>;

export function getArticleLocale(
  article: Article,
  requestedLocale: Locale,
): Locale {
  if (article.translations[requestedLocale]) return requestedLocale;
  const otherLocale = requestedLocale === "ar" ? "en" : "ar";
  if (!article.translations[otherLocale])
    throw new Error("Article has no published translation");
  return otherLocale;
}
export function getArticleTranslation(article: Article, locale: Locale) {
  return article.translations[getArticleLocale(article, locale)]!;
}
