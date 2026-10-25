# Content image uploads

Open `/admin/content`, edit an article or project, and use **رفع صورة** in the cover section. Select a JPG, PNG or WebP up to 5 MiB, optionally add Arabic/English alternative text, then save the content. A landscape 16:9 image works best. Publishing rules and locale redirects are unchanged.

The cover is displayed in public cards, detail pages, and Open Graph/Twitter metadata. With no cover, articles keep their text cards and projects keep their existing illustration. Detail images preserve the full picture; cards crop to their frame. Alt text falls back to the content title in the displayed language. Next Image optimizes public images through a remote pattern restricted to this project's bucket. Restart a running development server after changing `next.config.ts`.

## Storage and permissions

Only **Personal website** (`cdoaudugbjrkhyhivaaa`) is used. Migration `content_images` created a public `content-images` bucket, set the MIME allowlist and 5 MiB size limit, added the two cover columns with constraints, and extended the existing atomic `save_site_entry` RPC. SQL is archived at `scripts/content-images-schema.sql`; do not replay it. The existing project URL and publishable key are sufficient; no additional environment variables or service-role key are needed.

The browser uses `@supabase/ssr` and the same Auth cookies as admin login. Files upload directly to Storage (not through Next Server Actions or a serverless upload endpoint). Bucket restrictions apply at Storage; INSERT/SELECT RLS additionally requires `private.is_site_owner()`, the existing live Auth identity check. Anonymous visitors and other authenticated accounts cannot upload or list objects. Valid names are `articles/<uuid>.<ext>` and `projects/<uuid>.<ext>`. SVG and arbitrary paths are excluded. The editor also checks size/type, decodes the image and rejects images over 40 megapixels before uploading; decoding is a browser UX check, not a substitute for Storage RLS and bucket limits.

All files in this bucket, **including draft images**, are accessible to anyone who has their URL as soon as they are uploaded. This is a public media bucket, not storage for confidential files. Listings are owner-only.

## Save and replacement behavior

Uploads create random immutable paths (`upsert: false`). There is deliberately no UPDATE or DELETE Storage policy. Replacing a cover does not overwrite the live file. A completed upload only changes the editor's draft; saving content persists its path and alternative text in the database. Save/close controls are disabled during upload. Failed uploads retain the previous cover and content; failed saves retain the draft for retry.

The RPC validates the path's content folder and confirms the object exists in this bucket. It preserves existing owner checks, row locking, optimistic version checks, atomic translation writes and publication behavior. Calls that omit cover keys preserve existing covers. Removing a cover clears its association on save; it does **not** delete the file. Replaced, abandoned or deleted-content assets remain in Storage. Future cleanup should first confirm there are no references and use the Storage API, never direct SQL deletion.

## Verification

`tests/integration/content-images.sql` uses rolled-back metadata/content fixtures to verify owner/non-owner/anonymous permissions, path restrictions, immutable objects, article/project cover persistence, stale writes, missing-object rejection and unlinking. Unit/component tests cover validation, failed uploads, blocked saves while uploading, localized alternative text and image removal. `tests/e2e/content-images.spec.ts` verifies existing uploaded covers load through Next Image in public cards/details and sharing metadata. It passed with the owner's published Quiz App cover, alongside the admin protection tests (Chrome channel). The owner's upload interaction itself is not automated. Existing security-advisor findings (private receipt tables and disabled leaked-password protection) are unchanged.

The older `tests/e2e/content.spec.ts` expects the original seeded project/article counts, titles and slugs. Those fixtures were replaced with real content, so its four tests no longer match the live database. They must run against a dedicated seeded test database or be updated separately; no live content was restored to satisfy them.

References: [Supabase bucket restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [public bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals), [upload API](https://supabase.com/docs/reference/javascript/storage-from-upload).
