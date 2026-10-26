# Content image uploads

Open `/admin/content`, edit an article or project, and choose **رفع صورة**, **من المكتبة**, or **رابط صورة**. Upload accepts JPG, PNG or WebP up to 5 MiB. Before upload, the browser attempts a WebP conversion at quality 0.85 and a maximum dimension of 1920 px; the converted result is used only when smaller. The original is retained when conversion is unavailable or larger. Existing files are not rewritten. Library selection can reuse any image across articles and projects. For a link, enter a direct public HTTPS image URL and press **استخدام الرابط**, then save the content. Arabic/English alternative text is available for every source. A landscape 16:9 image works best.

The cover is displayed in public cards, detail pages, and Open Graph/Twitter metadata. With no cover, articles keep their text cards and projects keep their existing illustration. Detail images preserve the full picture; cards crop to their frame. Alt text falls back to the content title. Next Image optimizes Storage images through the existing bucket allowlist. External images load directly in the visitor's browser with `unoptimized`; arbitrary domains are not added to the server image optimizer. HTTPS links with credentials, non-web schemes and relative URLs are rejected. The external host must permit public image loading. Pasted public URLs from our bucket are normalized to a Storage path.

## Media library

`/admin/media` is an owner-protected page in admin navigation. It displays the site's uploaded images with thumbnails, file name, size, date and usage status. Folder filters and pagination show 24 images per page. The same library is available inside the content editor. The standalone page can copy a public URL or permanently delete an unused file after confirmation.

Images used in published content, drafts, direct Markdown URLs or site settings cannot be deleted until their references are removed. Usage checks now read the indexed `private.content_image_references` table, maintained transactionally by triggers and backfilled for existing content. Media thumbnails and bucket-hosted Markdown images use Next Image; external Markdown images remain direct browser loads. Removing a cover in an editor only unlinks it on save. Library deletion removes the actual file through the Storage API. Copies already cached in browsers or a CDN may remain accessible temporarily.

## Storage and permissions

Only **Personal website** (`cdoaudugbjrkhyhivaaa`) is used. Migration `content_images` created the bucket and original cover columns. Migration `media_library` added `cover_image_url`, relaxed folder restrictions for reuse, extended `save_site_entry`, and added library/deletion RPCs and protections. SQL is archived at `scripts/content-images-schema.sql` and `scripts/media-library-schema.sql`; do not replay them. Existing environment variables and the publishable key are sufficient; no service-role key is used.

The browser uses `@supabase/ssr` and the same Auth cookies as admin login. Files upload directly to Storage (not through Next Server Actions or a serverless upload endpoint). Bucket restrictions apply at Storage; INSERT/SELECT RLS additionally requires `private.is_site_owner()`, the existing live Auth identity check. Anonymous visitors and other authenticated accounts cannot upload or list objects. Valid names are `articles/<uuid>.<ext>` and `projects/<uuid>.<ext>`. SVG and arbitrary paths are excluded. The editor also checks size/type, decodes the image and rejects images over 40 megapixels before uploading; decoding is a browser UX check, not a substitute for Storage RLS and bucket limits.

All files in this bucket, **including draft images**, are accessible to anyone who has their URL as soon as they are uploaded. This is a public media bucket, not storage for confidential files. Listings are owner-only.

## Save and replacement behavior

Uploads create random immutable paths (`upsert: false`); there is no UPDATE Storage policy. Replacing a cover does not overwrite the live file. A completed upload, library choice or applied URL changes the editor's draft; saving persists it. A database constraint allows either a Storage path or external URL, not both. Save/close controls are disabled during upload. Failed uploads retain the previous cover; failed saves retain the draft for retry.

The save RPC confirms a selected Storage object exists and preserves authorization, optimistic version checks and atomic translation writes. Library reads and deletion preparation are SECURITY INVOKER RPCs with explicit owner checks and no anon EXECUTE. `prepare_content_image_deletion` checks current references and persists a reservation in the private RLS-protected `content_image_deletions` table. A transaction advisory lock serializes that check with triggers on content/settings writes, preventing new references during deletion. Triggers reject reserved paths, including direct Markdown and settings URLs. Storage DELETE RLS requires the real owner, matching bucket, reservation and no current usage. Files are removed via `storage.remove`, never SQL DELETE.

Reservations remain after deletion and ambiguous Storage/network failures. Remaining objects are marked as pending deletion and allow retry; they cannot be selected or saved as covers. Reservations are small durable tombstones for UUID paths and must not be cleared blindly after a failed request. No real images were deleted during implementation.

## Verification

`tests/integration/media-library.sql` checks cross-folder reuse, external URL persistence, references in Markdown/SEO, idempotent deletion reservations, rejected reuse after reservation, and anonymous/non-owner library denial. Mocked action/component tests verify Storage deletion sequencing and failure reporting, confirmation, used-image protection, paging, and choosing a library image or URL. Live owner-session deletion of a real binary is not automated.

`tests/integration/content-images.sql` uses rolled-back metadata/content fixtures to verify owner/non-owner/anonymous permissions, path restrictions, immutable objects, article/project cover persistence, stale writes, missing-object rejection and unlinking. Unit/component tests cover validation, failed uploads, blocked saves while uploading, localized alternative text and image removal. `tests/e2e/content-images.spec.ts` verifies existing uploaded covers load through Next Image in public cards/details and sharing metadata. It passed with the owner's published Quiz App cover, alongside the admin protection tests (Chrome channel). The owner's upload interaction itself is not automated. Existing security-advisor findings (private receipt tables and disabled leaked-password protection) are unchanged.

`tests/e2e/content.spec.ts` now discovers current published links instead of relying on the original seed titles/counts. It checks bounded homepage selections, detail navigation, canonical language routing, pagination input and HTTP 404 responses. No live content is restored or inserted for these browser checks.

References: [Supabase bucket restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [public bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals), [upload API](https://supabase.com/docs/reference/javascript/storage-from-upload).
