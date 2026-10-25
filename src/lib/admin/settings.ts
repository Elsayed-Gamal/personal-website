import { z } from "zod";
import {
  aboutContentSchema,
  contactContentSchema,
  homeContentSchema,
  siteUISchema,
  type Locale,
} from "@/lib/content";

export const settingsKeySchema = z.enum(["ui", "home", "about", "contact"]);
export type SettingsKey = z.infer<typeof settingsKeySchema>;
export type SettingsValue =
  | z.infer<typeof siteUISchema>
  | z.infer<typeof homeContentSchema>
  | z.infer<typeof aboutContentSchema>
  | z.infer<typeof contactContentSchema>;
export type SettingsRecord = {
  key: SettingsKey;
  locale: Locale;
  value: SettingsValue;
  updated_at: string;
};

export const settingsValueSchemas = {
  ui: siteUISchema,
  home: homeContentSchema,
  about: aboutContentSchema,
  contact: contactContentSchema,
};
export const saveSettingsSchema = z
  .discriminatedUnion("key", [
    z.object({
      key: z.literal("ui"),
      locale: z.enum(["ar", "en"]),
      version: z.string().datetime({ offset: true }),
      value: siteUISchema,
    }),
    z.object({
      key: z.literal("home"),
      locale: z.enum(["ar", "en"]),
      version: z.string().datetime({ offset: true }),
      value: homeContentSchema,
    }),
    z.object({
      key: z.literal("about"),
      locale: z.enum(["ar", "en"]),
      version: z.string().datetime({ offset: true }),
      value: aboutContentSchema,
    }),
    z.object({
      key: z.literal("contact"),
      locale: z.enum(["ar", "en"]),
      version: z.string().datetime({ offset: true }),
      value: contactContentSchema,
    }),
  ])
  .superRefine((input, ctx) => {
    function check(value: unknown, path: (string | number)[]) {
      // SEO fields are optional overrides with their own limits and URL validation.
      if (path[1] === "seo") return;
      if (typeof value === "string" && (!value.trim() || value.length > 2000)) {
        ctx.addIssue({
          code: "custom",
          message: "أدخل نصًا من 1 إلى 2000 حرف.",
          path,
        });
      } else if (value && typeof value === "object") {
        Object.entries(value).forEach(([key, item]) =>
          check(item, [...path, Array.isArray(value) ? Number(key) : key]),
        );
      }
    }
    check(input.value, ["value"]);
  });

export type SaveSettingsResult =
  | { ok: true; record: SettingsRecord }
  | {
      ok: false;
      message: string;
      fields?: Record<string, string>;
      conflict?: boolean;
    };
