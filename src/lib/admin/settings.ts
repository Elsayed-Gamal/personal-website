import { z } from "zod";
import { homeContentSchema, siteUISchema, type Locale } from "@/lib/content";

export const settingsKeySchema = z.enum(["ui", "home"]);
export type SettingsKey = z.infer<typeof settingsKeySchema>;
export type SettingsValue =
  z.infer<typeof siteUISchema> | z.infer<typeof homeContentSchema>;
export type SettingsRecord = {
  key: SettingsKey;
  locale: Locale;
  value: SettingsValue;
  updated_at: string;
};

export const settingsValueSchemas = {
  ui: siteUISchema,
  home: homeContentSchema,
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
  ])
  .superRefine((input, ctx) => {
    function check(value: unknown, path: (string | number)[]) {
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
