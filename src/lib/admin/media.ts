import { z } from "zod";

export const mediaQuerySchema = z.object({
  page: z.number().int().min(0).max(10000).default(0),
  folder: z.enum(["all", "articles", "projects"]).default("all"),
});
export type MediaQuery = z.infer<typeof mediaQuerySchema>;
export const MEDIA_PAGE_SIZE = 24;
export const mediaImageSchema = z.object({
  path: z.string(),
  created_at: z.string(),
  bytes: z.coerce.number().nullable(),
  in_use: z.boolean(),
  deleting: z.boolean(),
});
export type MediaImage = z.infer<typeof mediaImageSchema>;
export type MediaPage = { images: MediaImage[]; hasMore: boolean };
export type MediaResult =
  { ok: true; page: MediaPage } | { ok: false; message: string };
