import { z } from "zod";
import { SUPABASE_PROJECT_URL } from "@/lib/supabase/config";

export const CONTENT_IMAGES_BUCKET = "content-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export const imagePathSchema = z
  .string()
  .regex(
    /^(articles|projects)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/,
    "اختر صورة مرفوعة من محرر المحتوى.",
  );
export const coverImageFields = {
  cover_image_path: imagePathSchema.nullable().default(null),
  cover_image_url: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          !!url.hostname &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    }, "أدخل رابط صورة كاملًا يبدأ بـ https:// بدون بيانات دخول.")
    .nullable()
    .default(null),
  cover_image_alt: z
    .object({
      ar: z.string().trim().max(200),
      en: z.string().trim().max(200),
    })
    .default({ ar: "", en: "" }),
};

export function contentImageUrl(
  path: string | null | undefined,
  externalUrl?: string | null,
) {
  if (path && imagePathSchema.safeParse(path).success)
    return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${CONTENT_IMAGES_BUCKET}/${path}`;
  return externalUrl &&
    coverImageFields.cover_image_url.safeParse(externalUrl).success
    ? externalUrl
    : null;
}

// Pasting one of our public URLs is equivalent to choosing it from the library.
export function coverSourceFromUrl(value: string) {
  const url = coverImageFields.cover_image_url.parse(value);
  if (!url) return { cover_image_path: null, cover_image_url: null };
  const parsed = new URL(url);
  const prefix = `/storage/v1/object/public/${CONTENT_IMAGES_BUCKET}/`;
  if (
    parsed.origin === SUPABASE_PROJECT_URL &&
    parsed.pathname.startsWith(prefix)
  ) {
    const path = imagePathSchema.parse(
      decodeURIComponent(parsed.pathname.slice(prefix.length)),
    );
    return { cover_image_path: path, cover_image_url: null };
  }
  return { cover_image_path: null, cover_image_url: parsed.href };
}

export function validateImageFile(file: Pick<File, "size" | "type">) {
  if (!Object.hasOwn(IMAGE_TYPES, file.type))
    return "اختر صورة بصيغة JPG أو PNG أو WebP.";
  if (!file.size) return "الصورة فارغة. اختر ملفًا آخر.";
  if (file.size > MAX_IMAGE_BYTES) return "الحد الأقصى لحجم الصورة 5 ميجابايت.";
  return null;
}
