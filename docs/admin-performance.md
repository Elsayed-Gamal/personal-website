# Admin navigation performance

The link-pending spinner and its portal/overlay are removed. Only the ordinary `loading.tsx` route fallback remains. `AdminLink` now handles **intent prefetch only**: mouse hover, keyboard focus or touch enables Next's full `prefetch={true}` for the dynamic destination. There is no artificial delay, custom private-data cache or authentication bypass. Before intent, prefetch is disabled to avoid loading all admin datasets at once. Automatic Link prefetch operates in production, not `next dev`.

The content list selects summary columns and translation titles/slugs/publication flags, not Markdown bodies, excerpts or project summaries. Opening an editor calls the authorized `loadContent` action to fetch one complete entry. An error or deleted entry leaves the list visible; incomplete summaries never reach the editor/save action. Deletion still uses the list's version, and editing uses the freshly fetched version. Summary rows are still fetched in batches; search and pagination remain client-side.

Successful content save/delete invalidates both content and dashboard routes; message read-state/delete invalidates messages and dashboard. Settings already invalidates its route and the public locale. Server Actions use Next's router-cache invalidation; no persistent browser cache is introduced. External changes and newly received contact messages may require the existing refresh control. Full prefetch improves navigation only when it has time to complete, and costs additional reads for destinations you do not ultimately visit.

## Production measurement

Set `ADMIN_PERFORMANCE_LOG=true` **on the server** while diagnosing, then start a production build:

```sh
npm run build
ADMIN_PERFORMANCE_LOG=true npm run start -- -p 3103
```

The server emits `[admin-performance]` with a fixed stage and milliseconds only:

- `proxy.auth`: the live Auth check before routing.
- `server.auth`: the live server authorization check (deduplicated within the React request).
- `database.response-headers`: each authenticated Data API request until response headers arrive; excludes body parsing and rendering.

No URLs, IDs, emails, cookies, query text or returned content are logged. Timings may overlap across requests; they are not a distributed trace and must not simply be summed. Disable this flag after diagnosis. No timing is evidence of performance improvement without comparable authenticated samples.

For browser end-to-end measurement, save your own local authenticated session outside the repository, without sharing it. One option is Playwright codegen against the local production server:

```sh
npx playwright codegen --channel chrome --save-storage=/tmp/personal-website-admin.auth.json http://127.0.0.1:3103/admin/login
```

Log in yourself, close that browser, then stop the manually started server so the test runner can own port 3103. The saved file contains credentials: keep it local and delete it after measuring. Do not commit or attach it.

```sh
ADMIN_PERFORMANCE_LOG=true ADMIN_E2E_AUTH_STATE=/tmp/personal-website-admin.auth.json PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- tests/e2e/admin-performance.spec.ts
```

This read-only test uses a fresh browser context per case, compares click-to-visible-content with cold navigation versus completed prefetch, and reports RSC payload bytes. Prefetch lead time is deliberately excluded from the warm click duration. Run multiple times before comparing medians; one run is not a reliable speedup claim. Screenshots/video/traces are disabled for this test; its attachment contains only path, mode, time and byte count. The test is skipped when no owner session is supplied. It does not test save/delete or change any records.

No authenticated timing baseline has been recorded by the agent because the owner session was not provided. Unit checks and anonymous browser checks are not substitutes for that measurement.

A read-only check on the permitted project's currently published rows verified both narrowed selects. For three published articles the raw JSON response decreased from 4,402 to 952 bytes (78%); for three published projects it decreased from 4,194 to 662 bytes (84%). These are anonymous Data API payload sizes, not authenticated navigation timings or guaranteed speedups. Drafts were not included and no data was changed.

References: [Next Link prefetch](https://nextjs.org/docs/app/api-reference/components/link#prefetch), [Server Action invalidation](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).
