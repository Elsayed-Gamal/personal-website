# Search engine indexing

Next.js serves `/sitemap.xml` and `/robots.txt` from the root without a locale
redirect. The sitemap includes the five public pages in Arabic and English,
all published projects, and each published article translation at its own slug.
Language alternatives are reciprocal; unpublished translations and admin/API
routes are excluded from the sitemap. Content entries use the database
`updated_at` timestamp. Static pages omit `lastmod` rather than inventing dates.

Before submitting to Google, set the production origin (for example,
`https://your-domain.com`) under **Settings → SEO → Site URL**. Set the same
origin for both locales so page canonical URLs match the sitemap. At least one
locale must have a site URL configured; missing or conflicting domains produce
an error rather than publishing placeholder URLs.

Content is fetched in stable batches using the existing public Supabase client
and published-content policies. Only identifiers, timestamps and translation
routing fields are loaded. Query failures fail sitemap generation instead of
publishing an incomplete list.

Successful admin saves, deletes, publication changes and settings saves expire
the shared `public-content` cache. The next sitemap request reads the updated
content, without a deployment. The routes are generated on request, while data
is cached for 300 seconds, matching public page caching. Direct database edits
are picked up by request-driven cache revalidation after that interval (the
request that triggers background revalidation may still receive cached data).
There is no scheduled polling job.

After deployment:

1. Open `/sitemap.xml` and `/robots.txt` on the production domain and verify they
   return HTTP 200 without a locale redirect.
2. Verify the site in Google Search Console and submit `/sitemap.xml` once.
3. Publish a new item in the admin panel and check that its published language
   URLs appear in the next sitemap response. Unpublishing or deleting removes it.

Google decides when to crawl and index each URL. Updating the sitemap does not
submit individual indexing requests. `robots.txt` gives crawling instructions;
admin access remains protected by the existing authentication.
