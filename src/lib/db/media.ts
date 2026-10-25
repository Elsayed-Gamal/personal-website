import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createAuthClient } from "@/lib/supabase/auth-server";
import {
  MEDIA_PAGE_SIZE,
  mediaImageSchema,
  mediaQuerySchema,
  type MediaQuery,
  type MediaPage,
} from "@/lib/admin/media";

export async function getMediaPage(input: MediaQuery): Promise<MediaPage> {
  await requireAdmin();
  const query = mediaQuerySchema.parse(input);
  const client = await createAuthClient();
  const { data, error } = await client.rpc("list_content_images", {
    page_offset: query.page * MEDIA_PAGE_SIZE,
    page_size: MEDIA_PAGE_SIZE + 1,
    folder: query.folder,
  });
  if (error) throw new Error("تعذر تحميل مكتبة الصور. حاول مجددًا.");
  const images = mediaImageSchema.array().parse(data ?? []);
  return {
    images: images.slice(0, MEDIA_PAGE_SIZE),
    hasMore: images.length > MEDIA_PAGE_SIZE,
  };
}
