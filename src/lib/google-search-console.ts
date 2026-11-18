import "server-only";
import { sign } from "node:crypto";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";

const tokenUrl = "https://oauth2.googleapis.com/token";
const scope = "https://www.googleapis.com/auth/webmasters.readonly";
const rowSchema = z.object({
  keys: z.array(z.string()).optional(),
  clicks: z.number().nonnegative(),
  impressions: z.number().nonnegative(),
  ctr: z.number().min(0).max(1),
  position: z.number().nonnegative(),
});
type Row = z.infer<typeof rowSchema>;

function dateOffset(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function getServiceAccountConfig() {
  const email = process.env.SEARCH_CONSOLE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.SEARCH_CONSOLE_PRIVATE_KEY?.trim().replace(
    /\\n/g,
    "\n",
  );
  if (!email || !privateKey) return null;
  return { email, privateKey };
}

async function getAccessToken() {
  const account = getServiceAccountConfig();
  if (!account) throw new Error("Missing Search Console service account");
  const issuedAt = Math.floor(Date.now() / 1000);
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const claims = [
    encode({ alg: "RS256", typ: "JWT" }),
    encode({
      iss: account.email,
      scope,
      aud: tokenUrl,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  ].join(".");
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(claims),
    account.privateKey,
  ).toString("base64url");
  const response = await fetch(tokenUrl, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${claims}.${signature}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Google token HTTP ${response.status}`);
  return z
    .object({ access_token: z.string().min(1) })
    .parse(await response.json()).access_token;
}

async function queryAnalytics(
  site: string,
  token: string,
  startDate: string,
  endDate: string,
  dimension?: "date" | "query" | "page",
) {
  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        type: "web",
        dataState: "final",
        dimensions: dimension ? [dimension] : [],
        rowLimit: dimension === "date" ? 90 : dimension ? 10 : 1,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) throw new Error(`Search Analytics HTTP ${response.status}`);
  return z
    .object({ rows: z.array(rowSchema).default([]) })
    .parse(await response.json()).rows;
}

const readReport = unstable_cache(
  async (site: string, endDate: string, days: number) => {
    const startDate = dateOffset(endDate, 1 - days);
    const token = await getAccessToken();
    const query = (dimension?: "date" | "query" | "page") =>
      queryAnalytics(site, token, startDate, endDate, dimension);
    const [totals, dates, queries, pages] = await Promise.all([
      query(),
      query("date"),
      query("query"),
      query("page"),
    ]);
    const byDay = new Map(dates.map((row) => [row.keys?.[0], row]));
    const daily = Array.from({ length: days }, (_, index) => {
      const date = dateOffset(startDate, index);
      const row = byDay.get(date);
      // Google omits days without rows. Keep gaps visible in the chart.
      return {
        date,
        clicks: row?.clicks ?? null,
        impressions: row?.impressions ?? null,
      };
    });
    const rank = (rows: Row[]) =>
      rows.flatMap((row) =>
        row.keys?.[0]
          ? [
              {
                label: row.keys[0],
                clicks: row.clicks,
                impressions: row.impressions,
              },
            ]
          : [],
      );
    return {
      startDate,
      endDate,
      total: totals[0] ?? null,
      daily,
      queries: rank(queries),
      pages: rank(pages),
    };
  },
  ["google-search-console-service-account-v1"],
  { revalidate: 900 },
);

export type SearchConsoleState =
  | { status: "unconfigured" | "unavailable" }
  | { status: "ready"; report: Awaited<ReturnType<typeof readReport>> };

export async function getSearchConsoleReport(
  days: 7 | 30 | 90,
): Promise<SearchConsoleState> {
  await requireAdmin();
  const site = process.env.SEARCH_CONSOLE_SITE?.trim();
  if (!site || !getServiceAccountConfig()) {
    return { status: "unconfigured" };
  }
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Los_Angeles",
  }).format(new Date());
  // Finalized Search Analytics data usually trails the current day.
  const endDate = dateOffset(today, -3);
  try {
    return { status: "ready", report: await readReport(site, endDate, days) };
  } catch (error) {
    const message =
      error instanceof Error &&
      /^(Google token|Search Analytics) HTTP \d{3}$/.test(error.message)
        ? error.message
        : "Invalid credentials, response, or network failure";
    console.warn("Search Console report unavailable:", message);
    return { status: "unavailable" };
  }
}
