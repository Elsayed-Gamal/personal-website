# Admin foundation

The Arabic admin area uses a separate root layout and is not linked from the public navigation. Routes: `/admin/dashboard`, `/admin/content`, `/admin/messages`, `/admin/settings`. `/admin` redirects to the dashboard after authorization; visitors are redirected to `/admin/login`.

The four pages are scaffolding. Editors, message queries, analytics collection and database mutations are not implemented yet. Existing database grants and RLS remain unchanged, including the private inbox. Future database access requires its own administrator RLS policies, and every future loader/action must call `requireAdmin()`; a protected layout alone is insufficient.

Authentication uses Supabase SSR cookies and live `auth.getUser()` verification. The proxy refreshes session cookies; both the protected layout and each protected page recheck authorization. Only the confirmed, non-anonymous account matching server-only `SUPABASE_ADMIN_EMAIL` may enter. Empty configuration denies access. User-editable metadata never grants access. Admin responses use private/no-store cache headers and noindex directives. These directives supplement, not replace, server authorization.

## Owner account

Only project **Personal website** (`cdoaudugbjrkhyhivaaa`) may be used. `eheeba@gmail.com` was not found in this project's Auth users during setup. Create the account through Supabase Dashboard → Authentication → Users, set a private password, and confirm ownership of the email. Do not share the password in chat or commit it. The same email is configured in `.env.local`; set `SUPABASE_ADMIN_EMAIL` in the deployment environment too. Restart the server after changing environment configuration. No service-role key is required by this foundation.

The application provides password login and local-session logout, without public registration or password-reset flows. Supabase Auth applies its configured authentication rate limits. Authorization checks run on every request, including direct URLs, so a registered non-owner cannot enter.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, then `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Admin tests cover the authorization allowlist, unconfirmed/anonymous/non-owner denial, all protected routes, malformed session cookies, noindex/no-store, and the mobile login view. A real successful login/logout needs the owner account to exist and its password; it cannot be verified until that setup is complete.

SSR reference: https://supabase.com/docs/guides/auth/server-side/creating-a-client
