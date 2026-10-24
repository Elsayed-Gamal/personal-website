# Admin navigation performance

`AdminLink` uses Next.js `useLinkStatus` to show a small inline spinner while a link navigation is pending; the ordinary `loading.tsx` route fallback remains for page loading. Prefetch is explicitly disabled on these links, so opening an admin destination starts its request only after navigation. The indicator reports navigation state but does not make server or database work faster. There is no custom private-data cache or authentication bypass.

The content list selects summary columns and translation titles/slugs/publication flags, not Markdown bodies, excerpts or project summaries. Opening an editor calls the authorized `loadContent` action to fetch one complete entry. An error or deleted entry leaves the list visible; incomplete summaries never reach the editor/save action. Deletion still uses the list's version, and editing uses the freshly fetched version. Summary rows are still fetched in batches; search and pagination remain client-side.

Successful content save/delete invalidates both content and dashboard routes; message read-state/delete invalidates messages and dashboard. Settings already invalidates its route and the public locale. Server Actions use Next's router-cache invalidation; no persistent browser cache is introduced. External changes and newly received contact messages may require the existing refresh control.

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

No authenticated timing baseline has been recorded by the agent because the owner session was not provided. Unit checks and anonymous browser checks are not substitutes for that measurement.

A read-only check on the permitted project's currently published rows verified both narrowed selects. For three published articles the raw JSON response decreased from 4,402 to 952 bytes (78%); for three published projects it decreased from 4,194 to 662 bytes (84%). These are anonymous Data API payload sizes, not authenticated navigation timings or guaranteed speedups. Drafts were not included and no data was changed.

Reference: [Server Action invalidation](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).
