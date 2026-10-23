# Admin foundation

The Arabic admin area uses a separate root layout and is not linked from the public navigation. Routes: `/admin/dashboard`, `/admin/content`, `/admin/messages`, `/admin/settings`. `/admin` redirects to the dashboard after authorization; visitors are redirected to `/admin/login`.

Settings provides live editors for the Arabic/English site identity, navigation, footer, labels, and every homepage section. [Content management](content-management.md) supports article/project CRUD, publication and translations. The [private inbox](messages.md) receives contact-form messages and supports read/unread state and deletion. The [dashboard](dashboard.md) shows live inventory, inbox activity and page-view analytics. Every loader/action must call `requireAdmin()`; a protected layout alone is insufficient.

Authentication uses Supabase SSR cookies and live `auth.getUser()` verification. The proxy refreshes session cookies; both the protected layout and each protected page recheck authorization. Only the confirmed, non-anonymous account matching server-only `SUPABASE_ADMIN_EMAIL` may enter. Empty configuration denies access. User-editable metadata never grants access. Admin responses use private/no-store cache headers and noindex directives. These directives supplement, not replace, server authorization.

## Owner account

Only project **Personal website** (`cdoaudugbjrkhyhivaaa`) may be used. The confirmed account `eheeba@gmail.com` exists in this project's Auth users. The same email is configured in `.env.local`; set `SUPABASE_ADMIN_EMAIL` in deployment too. Restart after environment changes. No service-role key is used. Changing ownership also requires updating the database authorization function through a reviewed migration.

## Saving settings

Each save updates one section (`ui` or `home`) in one language, using the loaded `updated_at` as an optimistic concurrency check. A database trigger generates the new timestamp. Stale writes return a conflict, preserving the draft until the user explicitly reloads. Inputs are validated server-side against the existing content schema, required nonblank strings, and a 2000-character limit per field. Saving publishes immediately; it does not create drafts. Other pages' copy and SEO metadata are outside this editor.

Migration `admin_site_settings` was applied through Supabase's migration API; its exact SQL is archived in `scripts/admin-settings-schema.sql` because the Supabase CLI is not installed. Do not replay it. It grants only `UPDATE(value)` on `site_content` to authenticated users, with RLS restricted to the two keys and the owner. The non-exposed `private.is_site_owner()` helper checks the calling `auth.uid()` against the live, confirmed, non-anonymous, non-banned Auth account. Its narrowly scoped SECURITY DEFINER privilege is required to read `auth.users`; execution is revoked from PUBLIC and anon. No user-controlled metadata grants permission. Existing public reads and private inbox restrictions remain.

`tests/integration/admin-settings.sql` validates owner/non-owner/anonymous access, column restrictions, out-of-scope keys, and stale-write rejection inside a transaction that rolls back. Settings action tests verify authentication, validation, row/version filters, errors, and revalidation. Actual owner login in the browser requires the owner's private password and is not automated.

The security advisor reported no new RLS warnings. It also reported disabled leaked-password protection in the project's Auth configuration: [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No Auth account settings were changed.

The application provides password login and local-session logout, without public registration or password-reset flows. Supabase Auth applies its configured authentication rate limits. Authorization checks run on every request, including direct URLs, so a registered non-owner cannot enter.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, then `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Admin tests cover the authorization allowlist, unconfirmed/anonymous/non-owner denial, all protected routes, malformed session cookies, noindex/no-store, and the mobile login view. A real successful login/logout needs the owner account to exist and its password; it cannot be verified until that setup is complete.

SSR reference: https://supabase.com/docs/guides/auth/server-side/creating-a-client
