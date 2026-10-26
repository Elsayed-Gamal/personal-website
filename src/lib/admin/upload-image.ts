"use client";
import { createBrowserAuthClient } from "@/lib/supabase/browser";
import {
  CONTENT_IMAGES_BUCKET,
  IMAGE_TYPES,
  validateImageFile,
} from "@/lib/content-images";
import type { ContentKind } from "./content";

export async function uploadContentImage(file: File, kind: ContentKind) {
  const issue = validateImageFile(file);
  if (issue) throw new Error(issue);
  // Decode before sending: a renamed document must not become a broken cover.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("تعذر قراءة الصورة. اختر ملف صورة سليمًا.");
  }
  const tooLarge = bitmap.width * bitmap.height > 40000000;
  if (tooLarge) {
    bitmap.close();
    throw new Error(
      "أبعاد الصورة كبيرة جدًا. استخدم صورة أصغر من 40 ميجابكسل.",
    );
  }
  let upload = file;
  try {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.85),
      );
      if (blob && blob.size < file.size)
        upload = new File([blob], "image.webp", { type: blob.type });
    }
  } finally {
    bitmap.close();
  }
  const extension = IMAGE_TYPES[upload.type as keyof typeof IMAGE_TYPES];
  const path = `${kind === "article" ? "articles" : "projects"}/${crypto.randomUUID()}.${extension}`;
  const client = createBrowserAuthClient();
  const { error } = await client.storage
    .from(CONTENT_IMAGES_BUCKET)
    .upload(path, upload, {
      cacheControl: "31536000",
      contentType: upload.type,
      upsert: false,
    });
  if (error) {
    if (
      String(error.statusCode) === "403" ||
      String(error.statusCode) === "401"
    )
      throw new Error(
        "ليس لديك صلاحية رفع الصور. أعد تسجيل الدخول بحساب المسؤول.",
      );
    throw new Error(
      "تعذر رفع الصورة. تحقق من الاتصال وحجم الملف ثم حاول مجددًا.",
    );
  }
  return path;
}
