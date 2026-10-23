# Personal website database

Only Supabase project `cdoaudugbjrkhyhivaaa` is permitted. Runtime configuration rejects every other project URL. Never run project discovery or operations against other projects.

## Local configuration

`.env.local` contains the project URL and its publishable key. Copy the variable names in `.env.example` into the deployment environment. No service-role key or database password is needed to serve the public site. Restart the development server after changing environment variables.

Public content is fetched by Server Components through Supabase's HTTPS Data API. Row Level Security applies to every request. Drizzle table definitions are in `src/lib/db/schema.ts`; Drizzle is **not** the runtime query transport in this phase. A direct Drizzle/Postgres connection would additionally require a private connection string, which has not been provided.

## Tables

| Table                | Purpose                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------- |
| projects             | Stable project slug, ordering, year, palette, stack, publication flag                       |
| project_translations | Arabic/English title, summary, body, category                                               |
| articles             | Stable content ID, original date, reading time, category labels, publication flag           |
| article_translations | Optional Arabic/English translations, globally unique slug, Markdown body, publication flag |
| site_content         | Localized UI and page copy for public pages and detail templates                            |
| messages             | Private inbox reserved for the later contact workflow                                       |

All six tables use RLS. Visitors and signed-in users may only read published content; neither can insert, update, or delete any rows. Translation visibility also requires a published parent. Messages have no public privileges or policies. Administrators can edit via Supabase Studio until the admin application is implemented.

Publish both project translations before publishing a project (the present design requires Arabic and English). Publish at least one article translation before publishing an article. Adding a second article language is another translation row for the same `article_id`. Existing slugs remain unchanged. An article listed in either site locale links to its available language; incoming alternate-language links are canonicalized by the proxy, including Arabic slugs.

## Initial migration and future changes

`drizzle/0000_content_schema.sql`, `drizzle/0001_content_seed.sql`, and `drizzle/0002_page_content.sql` were applied using Supabase's migration API as `website_content_schema`, `website_initial_content`, and `move_page_copy_to_database`. Supabase's migration history is authoritative. Do not apply the schema SQL again or run Drizzle push/migrate against an assumed empty database. For future changes, add a reviewed incremental SQL migration, update the Drizzle definitions, and apply it only to this project through Supabase.

`scripts/seed-content.json` preserves the original projects and articles, while `scripts/page-content-seed.json` preserves the localized page copy. Neither file is a runtime fallback. The database contains 3 projects, 6 project translations, 3 articles, 4 article translations, and 16 site-content records. The page-content keys are `ui`, `home`, `about`, `contact`, `work`, `blog`, `project_detail`, and `article_detail`, each in Arabic and English.

## Serving and verification

Pages render on request and use uncached Supabase fetches, with request-level deduplication. Content edits and new slugs do not require a new build. Missing records return 404; database failures display an error rather than silently serving the seed. The proxy returns 503 if its article lookup fails.

All visitor-facing editorial page copy is database-backed. Error-boundary messages remain local so they can render during a database outage. Control and screen-reader labels, plus the English text inside the decorative `aria-hidden` hero mockup, are implementation copy and intentionally remain local.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. After building, `npm run test:e2e` starts and stops its own production server on port 3103. It checks both languages, database-backed listings and details, Arabic/English article redirects, language switching, and 404 responses. To use an installed Chrome instead of Playwright's bundled Chromium, set `PLAYWRIGHT_CHANNEL=chrome`.

`npm run db:verify` performs a read-only comparison between the remote content and the original seed and verifies that the public key cannot read messages. Run this for initial import verification; it will intentionally report differences after you edit the content. `tests/integration/content-access.sql` tests draft visibility and permissions as both `anon` and `authenticated`, using fixtures that are rolled back. Run it only against the approved project.

The initial import passed exact content comparison, the rollback-only access tests, six unit tests and four browser tests. Supabase's security advisor reported only the expected informational notice for `messages`: RLS is enabled with no policies because inbox access is deliberately closed until the contact/admin feature is implemented. See [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Auth flows, the dashboard, comment/CRM features, analytics collection, uploads, and sending contact messages remain deferred. Storage contains no migrated image assets because `content.ts` contained no files.
