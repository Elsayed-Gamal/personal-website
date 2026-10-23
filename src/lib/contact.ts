import { z } from "zod";
export const contactSubmissionSchema = z.object({
  requestId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email())
    .transform((value) => value.toLowerCase()),
  message: z.string().trim().min(10).max(5000),
  locale: z.enum(["ar", "en"]),
  website: z.string().max(200).optional(),
});
export type ContactResult = {
  status: "sent" | "invalid" | "error" | "rate_limited";
  fields?: string[];
};
export const inboxMessageSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  // Do not let one legacy/direct-RPC address prevent the owner reading the inbox.
  email: z.string(),
  message: z.string(),
  locale: z.enum(["ar", "en"]),
  read_at: z.string().nullable(),
  created_at: z.string(),
});
export type InboxMessage = z.infer<typeof inboxMessageSchema>;
export const messageMutationSchema = z.object({
  id: z.uuid(),
  expectedReadAt: z.string().datetime({ offset: true }).nullable(),
});
