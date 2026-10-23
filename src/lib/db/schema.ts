import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uuid,
  primaryKey,
  index,
  check,
  pgPolicy,
  pgRole,
  bigint,
} from "drizzle-orm/pg-core";
import type { Locale, SiteContentKey, SiteUI } from "@/lib/content";

const anon = pgRole("anon").existing();
const authenticated = pgRole("authenticated").existing();
const readers = [anon, authenticated];
const times = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analyticsDaily = pgTable(
  "analytics_daily",
  {
    day: date("day").notNull(),
    path: text("path").notNull(),
    country: text("country").notNull(),
    views: bigint("views", { mode: "number" }).notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.day, t.path, t.country] }),
    check("analytics_daily_views_check", sql`${t.views} >= 0`),
    check(
      "analytics_daily_country_check",
      sql`${t.country} ~ '^[A-Z]{2}$' or ${t.country} = 'ZZ'`,
    ),
    pgPolicy("Owner reads analytics", {
      for: "select",
      to: authenticated,
      using: sql`(select private.is_site_owner())`,
    }),
  ],
).enableRLS();

export const projects = pgTable(
  "projects",
  {
    slug: text("slug").primaryKey(),
    sortOrder: integer("sort_order").notNull().default(0),
    year: text("year").notNull(),
    color: text("color").notNull(),
    stack: text("stack")
      .array()
      .notNull()
      .default(sql`'{}'`),
    published: boolean("published").notNull().default(false),
    ...times(),
  },
  (t) => [
    check("projects_color_check", sql`${t.color} in ('cyan','violet','amber')`),
    index("projects_published_order_idx").on(t.published, t.sortOrder),
    pgPolicy("Read published projects", {
      for: "select",
      to: readers,
      using: sql`${t.published}`,
    }),
    pgPolicy("Owner manages projects", {
      for: "all",
      to: authenticated,
      using: sql`(select private.is_site_owner())`,
      withCheck: sql`(select private.is_site_owner())`,
    }),
  ],
).enableRLS();

export const projectTranslations = pgTable(
  "project_translations",
  {
    projectSlug: text("project_slug")
      .notNull()
      .references(() => projects.slug, { onDelete: "cascade" }),
    locale: text("locale").$type<Locale>().notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    category: text("category").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectSlug, t.locale] }),
    check("project_translations_locale_check", sql`${t.locale} in ('ar','en')`),
    pgPolicy("Read published project translations", {
      for: "select",
      to: readers,
      using: sql`exists (select 1 from public.projects p where p.slug = ${t.projectSlug} and p.published)`,
    }),
    pgPolicy("Owner manages project translations", {
      for: "all",
      to: authenticated,
      using: sql`(select private.is_site_owner())`,
      withCheck: sql`(select private.is_site_owner())`,
    }),
  ],
).enableRLS();

export const articles = pgTable(
  "articles",
  {
    id: text("id").primaryKey(),
    date: date("date").notNull(),
    readingTime: integer("reading_time").notNull(),
    category: jsonb("category").$type<Record<Locale, string>>().notNull(),
    published: boolean("published").notNull().default(false),
    ...times(),
  },
  (t) => [
    check("articles_reading_time_check", sql`${t.readingTime} > 0`),
    check(
      "articles_category_check",
      sql`jsonb_typeof(${t.category}) = 'object'`,
    ),
    index("articles_published_date_idx").on(t.published, t.date.desc()),
    pgPolicy("Read published articles", {
      for: "select",
      to: readers,
      using: sql`${t.published}`,
    }),
    pgPolicy("Owner manages articles", {
      for: "all",
      to: authenticated,
      using: sql`(select private.is_site_owner())`,
      withCheck: sql`(select private.is_site_owner())`,
    }),
  ],
).enableRLS();

export const articleTranslations = pgTable(
  "article_translations",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    locale: text("locale").$type<Locale>().notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    published: boolean("published").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.articleId, t.locale] }),
    check("article_translations_locale_check", sql`${t.locale} in ('ar','en')`),
    check("article_translations_slug_check", sql`length(${t.slug}) > 0`),
    pgPolicy("Read published article translations", {
      for: "select",
      to: readers,
      using: sql`${t.published} and exists (select 1 from public.articles a where a.id = ${t.articleId} and a.published)`,
    }),
    pgPolicy("Owner manages article translations", {
      for: "all",
      to: authenticated,
      using: sql`(select private.is_site_owner())`,
      withCheck: sql`(select private.is_site_owner())`,
    }),
  ],
).enableRLS();

export const siteContent = pgTable(
  "site_content",
  {
    key: text("key").$type<SiteContentKey>().notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    value: jsonb("value").$type<SiteUI | Record<string, unknown>>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.locale] }),
    check(
      "site_content_key_check",
      sql`${t.key} in ('ui','home','about','contact','work','blog','project_detail','article_detail')`,
    ),
    check("site_content_locale_check", sql`${t.locale} in ('ar','en')`),
    check("site_content_value_check", sql`jsonb_typeof(${t.value}) = 'object'`),
    pgPolicy("Read public site copy", {
      for: "select",
      to: readers,
      using: sql`${t.key} in ('ui','home','about','contact','work','blog','project_detail','article_detail')`,
    }),
    pgPolicy("Owner updates site settings", {
      for: "update",
      to: authenticated,
      using: sql`${t.key} in ('ui','home') and (select private.is_site_owner())`,
      withCheck: sql`${t.key} in ('ui','home') and (select private.is_site_owner())`,
    }),
  ],
).enableRLS();

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    locale: text("locale").$type<Locale>().notNull().default("ar"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("messages_locale_check", sql`${t.locale} in ('ar','en')`),
    index("messages_created_at_idx").on(t.createdAt.desc()),
    pgPolicy("Owner reads messages", {
      for: "select",
      to: authenticated,
      using: sql`(select private.is_site_owner())`,
    }),
    pgPolicy("Owner marks messages", {
      for: "update",
      to: authenticated,
      using: sql`(select private.is_site_owner())`,
      withCheck: sql`(select private.is_site_owner())`,
    }),
    pgPolicy("Owner deletes messages", {
      for: "delete",
      to: authenticated,
      using: sql`(select private.is_site_owner())`,
    }),
  ],
).enableRLS();
