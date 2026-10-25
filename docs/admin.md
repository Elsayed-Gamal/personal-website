# Admin foundation

The Arabic admin area uses a separate root layout and is not linked from the public navigation. Routes: `/admin/dashboard`, `/admin/content`, `/admin/media`, `/admin/messages`, `/admin/settings`. The [media library](content-images.md) supports reusable cover selection, link copying and confirmed deletion of unused images. `/admin` redirects to the dashboard after authorization; visitors are redirected to `/admin/login`.

Settings provides live editors for the Arabic/English site identity, navigation, footer, labels, every homepage section, About, and Contact. [Content management](content-management.md) supports article/project CRUD, publication and translations. The [private inbox](messages.md) receives contact-form messages and supports read/unread state and deletion. The [dashboard](dashboard.md) shows live inventory, inbox activity and page-view analytics. Every loader/action must call `requireAdmin()`; a protected layout alone is insufficient.

Authentication uses Supabase SSR cookies and live `auth.getUser()` verification. The proxy refreshes session cookies; both the protected layout and each protected page recheck authorization. Only the confirmed, non-anonymous account matching server-only `SUPABASE_ADMIN_EMAIL` may enter. Empty configuration denies access. User-editable metadata never grants access. Admin responses use private/no-store cache headers and noindex directives. These directives supplement, not replace, server authorization.

## Owner account

Only project **Personal website** (`cdoaudugbjrkhyhivaaa`) may be used. The confirmed account `eheeba@gmail.com` exists in this project's Auth users. The same email is configured in `.env.local`; set `SUPABASE_ADMIN_EMAIL` in deployment too. Restart after environment changes. No service-role key is used. Changing ownership also requires updating the database authorization function through a reviewed migration.

## Saving settings

Each save updates one section (`ui`, `home`, `about`, or `contact`) in one language, using the loaded `updated_at` as an optimistic concurrency check. A database trigger generates the new timestamp. Stale writes return a conflict, preserving the draft until the user explicitly reloads. Inputs are validated server-side against the content schema. Ordinary copy requires nonblank strings up to 2000 characters; optional SEO overrides have their own limits. Saving publishes immediately; it does not create drafts.

About supports editing the introduction/story, four principle cards with the correct icon options, adding/removing tools, and CTA text. Contact supports the introduction, three project prompts, contact card and project link copy, and all form labels, feedback and privacy text. The obsolete `emailLabel` is preserved in storage but hidden from the editor because the public page no longer renders it. These fields are page copy, not Resend credentials or notification-recipient configuration. Preview links open the selected localized page. Existing public content and SEO loaders read these rows; the save action revalidates the locale layout.

Migration `admin_about_contact_settings` extends the existing owner-only UPDATE policy to `about` and `contact`; exact SQL is archived in `scripts/admin-page-settings-schema.sql`. It changes no content, tables, column grants, or identity checks. Rollback-only integration tests verified owner edits in both languages, stale-write protection, rejection of unrelated keys, and anonymous/non-owner denial.

### SEO settings

The `إعدادات SEO والمشاركة` group inside site settings saves a localized `seo` object within each existing `ui` row. No migration or permission expansion is required: the existing owner-only UPDATE policy and version checks apply. Legacy rows show blank optional fields until saved. Edit Arabic and English separately; use the same root site URL in both unless each language deliberately uses a separate domain.

The Personal website database's Arabic and English rows were explicitly initialized on 2026-10-25 with all six blank SEO fields using `scripts/initialize-seo-settings.sql`. This data-only update preserves existing copy and uses the existing timestamp trigger. Reload an already-open editor before saving so it reads the updated version.

Fields: search title (120 characters), description (320), root HTTP(S) site URL, absolute HTTP(S) sharing-image URL, image alt text (200), and an optional X handle (`@username`). URL credentials and non-web schemes are rejected. Blank title/description use the site's brand identity/footer. Clearing the image or handle removes the corresponding metadata. An unset site URL omits canonical URLs rather than publishing a placeholder domain. Image upload is not included; use an existing publicly accessible image URL.

Public routes generate metadata from saved settings. Home uses the SEO title/description; other pages use their localized content titles/descriptions and the configured title suffix. Articles/projects use their own titles and excerpts and their uploaded cover when present, falling back to the site sharing image. See [content image uploads](content-images.md). Each public page gets its own canonical URL when the root URL is configured. Single-language articles preserve the existing redirect to the available translation. Admin noindex settings are separate. Changes become available after saving, but search engines and social platforms control when their cached previews refresh. Sitemap, robots.txt and per-article SEO override editors are outside this change.

Migration `admin_site_settings` was applied through Supabase's migration API; its exact SQL is archived in `scripts/admin-settings-schema.sql` because the Supabase CLI is not installed. Do not replay it. It grants only `UPDATE(value)` on `site_content` to authenticated users, with RLS originally restricted to `ui` and `home`; the later migration described above expands this to the four editor sections. The non-exposed `private.is_site_owner()` helper checks the calling `auth.uid()` against the live, confirmed, non-anonymous, non-banned Auth account. Its narrowly scoped SECURITY DEFINER privilege is required to read `auth.users`; execution is revoked from PUBLIC and anon. No user-controlled metadata grants permission. Existing public reads and private inbox restrictions remain.

`tests/integration/admin-settings.sql` validates owner/non-owner/anonymous access, column restrictions, out-of-scope keys, and stale-write rejection inside a transaction that rolls back. Settings action tests verify authentication, validation, row/version filters, errors, and revalidation. Actual owner login in the browser requires the owner's private password and is not automated.

The security advisor reported no new RLS warnings. It also reported disabled leaked-password protection in the project's Auth configuration: [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No Auth account settings were changed.

The application provides password login and local-session logout, without public registration or password-reset flows. Supabase Auth applies its configured authentication rate limits. Authorization checks run on every request, including direct URLs, so a registered non-owner cannot enter.

## Verification

See [admin navigation performance](admin-performance.md) for reduced list payloads and opt-in production timing. Admin link prefetch is disabled; the ordinary route loading spinner remains.

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, then `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Admin tests cover the authorization allowlist, unconfirmed/anonymous/non-owner denial, all protected routes, malformed session cookies, noindex/no-store, and the mobile login view. A real successful login/logout needs the owner account to exist and its password; it cannot be verified until that setup is complete.

SSR reference: https://supabase.com/docs/guides/auth/server-side/creating-a-client
