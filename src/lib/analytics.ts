import { z } from "zod";
import { publicAnalyticsPath } from "./analytics-path";
export { publicAnalyticsPath } from "./analytics-path";
export const pageViewSchema = z
  .object({
    eventId: z.uuid(),
    path: z
      .string()
      .max(1000)
      .transform(publicAnalyticsPath)
      .refine((p): p is string => p !== null),
  })
  .strict();
export function countryFromHeaders(
  headers: Headers,
  onVercel = process.env.VERCEL === "1",
) {
  const country = onVercel
    ? headers.get("x-vercel-ip-country")?.toUpperCase()
    : null;
  return country && /^[A-Z]{2}$/.test(country) ? country : "ZZ";
}
export function analyticsEnabled() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ANALYTICS_DISABLED !== "true" &&
    process.env.VERCEL_ENV !== "preview"
  );
}
export function shouldIgnoreAnalytics(headers: Headers) {
  return (
    headers.get("dnt") === "1" ||
    headers.get("sec-gpc") === "1" ||
    /bot|crawler|spider|headless|playwright/i.test(
      headers.get("user-agent") ?? "",
    )
  );
}
const count = z.number().int().nonnegative();
const totals = z.object({ total: count, published: count });
export const dashboardSchema = z.object({
  generated_at: z.string(),
  days: z.number(),
  start_day: z.string(),
  end_day: z.string(),
  articles: totals,
  projects: totals,
  messages: z.object({ total: count, unread: count, period: count }),
  views: count,
  previous_views: count,
  known_country_views: count,
  daily: z.array(z.object({ day: z.string(), views: count })),
  countries: z.array(z.object({ country: z.string(), views: count })),
  pages: z.array(z.object({ path: z.string(), views: count })),
  recent_messages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      created_at: z.string(),
      read_at: z.string().nullable(),
    }),
  ),
  recent_content: z.array(
    z.object({
      kind: z.enum(["article", "project"]),
      id: z.string(),
      title: z.string(),
      published: z.boolean(),
      updated_at: z.string(),
    }),
  ),
});
export type DashboardData = z.infer<typeof dashboardSchema>;
export function dashboardDays(value: unknown): 7 | 30 | 90 {
  return value === "7" ? 7 : value === "90" ? 90 : 30;
}
export function viewTrend(current: number, previous: number) {
  return previous === 0
    ? null
    : Math.round(((current - previous) / previous) * 100);
}
