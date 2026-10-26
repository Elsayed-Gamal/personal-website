import { z } from "zod";
import { contentSummarySchema } from "./content";
import { inboxMessageSchema } from "@/lib/contact";
export const ADMIN_PAGE_SIZE = 10;
const base = {
  page: z.number().int().min(1).max(10000).default(1),
  search: z.string().trim().max(200).default(""),
};
export const contentQuerySchema = z.object({
  ...base,
  kind: z.enum(["article", "project"]).default("article"),
  status: z.enum(["all", "published", "draft"]).default("all"),
});
export type ContentQuery = z.infer<typeof contentQuerySchema>;
export const messageQuerySchema = z.object({
  ...base,
  filter: z.enum(["all", "read", "unread"]).default("all"),
});
export type MessageQuery = z.infer<typeof messageQuerySchema>;
const total = z.number().int().nonnegative();
export const contentPageSchema = z.object({
  items: z.array(contentSummarySchema),
  total,
  counts: z.object({
    article: total,
    project: total,
    published: total,
    draft: total,
  }),
});
export type ContentPage = z.infer<typeof contentPageSchema>;
export const messageSummarySchema = inboxMessageSchema
  .omit({ message: true })
  .extend({ snippet: z.string() });
export type MessageSummary = z.infer<typeof messageSummarySchema>;
export const messagePageSchema = z.object({
  items: z.array(messageSummarySchema),
  total,
  counts: z.object({ all: total, unread: total, read: total }),
});
export type MessagePage = z.infer<typeof messagePageSchema>;
export type PageResult<T> =
  { ok: true; page: T } | { ok: false; message: string };
