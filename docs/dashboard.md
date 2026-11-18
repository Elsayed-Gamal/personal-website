# Dashboard and page-view analytics

`/admin/dashboard` displays live article/project totals and publication status, unread/all-time messages, messages received during the selected period, the latest messages/content edits, and links to management pages. The 7/30/90-day selector controls analytics and period message counts; inventory totals remain all-time. All dates are bucketed in Africa/Cairo. Current periods include today's partial day, with comparison against the preceding equal-length period. A zero previous period shows no percentage rather than an invented increase.

The owner-only `get_dashboard(integer)` SECURITY INVOKER RPC returns a consistent aggregate query with zero-filled daily series. It checks the existing live owner identity helper and retains RLS. Anonymous callers cannot execute it; ordinary authenticated accounts cannot read aggregates. Database failures surface as errors, not fabricated zeros.

## Collection

Public pages mount a small client tracker. After one second of visibility it submits one page-view event per observed route change to `/api/analytics/page-view`. Prefetches do not mount it. It skips webdriver automation and respects Do Not Track / Global Privacy Control. The endpoint also filters known bot user agents and privacy headers, requires same-origin JSON, and bounds the request body to 2048 bytes. It is best-effort and does not interrupt page use.

Collection runs only in production, not development or Vercel preview deployments. Set server-only `ANALYTICS_DISABLED=true` and restart/redeploy to disable it. Production on other hosts is enabled by default. No extra secret key is required.

These are **page views**, not unique visitors or sessions. There are no persistent visitor identifiers, analytics cookies, local storage identifiers, stored IP addresses, full referrers, query strings or fragments. Event UUIDs only prevent retry duplicates; they cannot connect separate navigations into a visitor profile. Public browsing by the owner counts like other public browsing; admin routes never count.

The endpoint reads country from Vercel's `x-vercel-ip-country` header only when `VERCEL=1`. Elsewhere the country is `ZZ` (unknown); there is no fabricated geolocation or external IP lookup. Add a reviewed trusted-host adapter before accepting geography headers on another host. See [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-ip-country).

## Database and limits

Only **Personal website** (`cdoaudugbjrkhyhivaaa`) was modified. Migration `dashboard_analytics` was applied through Supabase's migration API; its SQL is archived at `scripts/dashboard-analytics-schema.sql`. Do not replay it.

`analytics_daily` stores day, public path, country and a view counter. Only the owner can SELECT it; public clients cannot read or write rows directly. The exposed SECURITY INVOKER `record_page_view` wrapper calls non-exposed `private.accept_page_view`, whose tightly scoped SECURITY DEFINER rights permit bounded anonymous insertion. This is intentional unauthenticated ingestion, not an admin operation. The private helper validates allowed paths, requires real published articles/projects for detail URLs, locks duplicate/rate checks, deduplicates event IDs, and caps collection at 600 accepted events/minute and 10,000/day globally.

The public ingestion API is unauthenticated. Determined callers can still fabricate legitimate-looking events/countries, consume the shared cap, or bypass client bot exclusions; these statistics are indicative, not fraud-proof or suitable for billing. Do not claim unique-person counts or precise geography.

Receipts live in non-exposed `private.analytics_receipts`, with RLS and no client table privileges. The `personal-website-analytics-cleanup` cron job purges receipts older than two days, daily aggregates older than 400 days, and old private daily counters at 03:17 UTC. Ingestion locks a private counter row for the current day and increments it atomically, retaining the existing per-minute/day caps and idempotency. Cleanup is no longer performed on each recording call.

## Verification

`tests/integration/dashboard.sql` verifies recording, duplicate suppression, admin/unknown-route rejection, privacy of aggregate reads, owner counts, period validation and zero-filled daily buckets, inside a rolled-back transaction. Unit tests cover endpoint origin/body constraints, privacy flags, country trust, authorization, failures, and visible route tracking without StrictMode duplicates. Browser tests ensure automated navigation is excluded and existing public pages still work. No owner password is used in testing.

Advisors report the intentionally closed private receipt tables with RLS and no policies ([reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)), plus the pre-existing disabled leaked-password protection setting ([reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).

## Google Search Console

The admin dashboard can show Google Web Search clicks, impressions, CTR, average
position, daily trends, top queries, and top pages. Its 7/30/90-day selector also
controls this report. Search Console uses Pacific dates. The report ends three
days before the current Pacific date and requests finalized data only. Missing
daily rows appear as gaps. Reports are cached for 15 minutes.

1. Enable the [Search Console API](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com)
   in the Google Cloud project you use for this integration.
2. Open [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
   in that project. Create a service account without assigning a Google Cloud
   IAM role. Under **Keys → Add key → Create new key** download its JSON key.
3. Open the verified Search Console property. Under **Settings → Users and
   permissions → Add user**, grant the service account email **Restricted**
   access to the property.
4. Add these server-side variables to Vercel Production, or to `.env.local`
   for development. Use the exact Search Console property identifier.

   | Variable                      | Value                                                                                                       |
   | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
   | `SEARCH_CONSOLE_SITE`         | `https://elsayedgamal.vercel.app/` for the URL-prefix property                                              |
   | `SEARCH_CONSOLE_CLIENT_EMAIL` | The service account's `client_email` from JSON                                                              |
   | `SEARCH_CONSOLE_PRIVATE_KEY`  | The complete `private_key` from JSON, stored as a Vercel secret. Actual newlines or escaped `\n` both work. |

5. Deploy and open `/admin/dashboard` as the site administrator. The server
   signs a short-lived assertion and requests a Google access token using
   the Search Console read-only scope. Keep the JSON key out of Git and chat.
   If the report is unavailable, verify the API is enabled and the account has
   access to the correct property.
