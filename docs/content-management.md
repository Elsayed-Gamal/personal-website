# Content management

`/admin/content` provides article/project lists, title/slug search, publication filters, server-side pagination, creation/editing, and confirmed permanent deletion. The owner-authorized `list_admin_content` RPC filters and returns 10 summaries per page plus counts. Full bodies and the editor bundle are fetched only when opening an editor, through an owner-authorized Server Action and a dynamic import. See [navigation performance](admin-performance.md).

Articles support one or two languages. Each translation has a distinct slug and publication flag; a published article requires at least one complete published translation. Hidden translations and draft articles remain unavailable to public readers. Empty category translations fall back to the provided language. The article and project Markdown fields provide an icon toolbar for formatting text and inserting common renderer-supported Markdown/GFM constructs: six heading levels, emphasis, strike-through, inline and fenced code, ordered/unordered/task lists, links, images, quotes, tables, footnotes, horizontal rules, and hard line breaks. The image picker can insert an existing library image or upload a new image directly to the content image library. Bare URLs are auto-linked by GFM. Markdown previews use the same sanitized renderer as public articles. Existing translation slugs are immutable to protect links. Removing a translation removes its URL on save.

Projects support Arabic and English, summary/category, year, ordering, card palette and technology stack. Project details use GitHub-flavored Markdown with the same sanitized editor preview and public renderer as articles, including headings, lists, links, tables, quotes and code blocks. Drafts may be incomplete; publishing requires complete translations in both languages. The project slug is fixed after creation. Articles and projects support an uploaded cover with Arabic/English alternative text; see [image uploads](content-images.md).

Saving changes publication state immediately. Choosing draft unpublishes content on save. The editor warns about unsaved navigation and preserves edits on errors. Deletion requires a separate confirmation and deletes translations through the existing foreign-key cascades; it is permanent.

## Authorization and atomic operations

Only **Personal website** (`cdoaudugbjrkhyhivaaa`) was modified. Migration `admin_content_management` was applied using Supabase's migration API; the SQL is archived at `scripts/admin-content-schema.sql`. The Supabase CLI is unavailable locally, so migration history is owned by the remote API. Do not replay the archived SQL or run Drizzle push against an assumed empty database.

The four content tables now grant authenticated CRUD, constrained by owner-only RLS using the existing private, live Auth identity lookup. Public SELECT policies are unchanged. Public pages use the separate anonymous content client, so the administrator's session never makes drafts appear in public listings.

`save_site_entry(jsonb)` and `delete_site_entry(text,text,timestamptz)` are SECURITY INVOKER functions with an empty search path, explicit owner authorization, RLS enforcement, and EXECUTE revoked from PUBLIC/anon. Saving the parent and all translations happens in one database transaction. Any translation failure rolls back the parent too. Updates lock the parent and compare its loaded timestamp; deletes compare the same version. Timestamp triggers prevent stale save/delete operations from silently overwriting work. Server Actions check authorization and validate inputs with Zod before invoking the functions. Public routes in both languages are revalidated after successful mutations.

## Verification

`tests/integration/admin-content.sql` runs rollback-only fixtures against the approved project, testing CRUD, unpublished content and translation visibility, duplicate-slug atomic rollback, stale writes/deletes, owner versus ordinary/anonymous access, unpublishing and cascading deletion. Fixtures never remain in the database.

Unit/component tests cover publication validation, Arabic and invalid slugs, language requirements, RPC authorization/error handling, search, confirmation before deletion, independent language edits, sanitized article/project Markdown previews, and keeping a draft after failure. Browser tests cover admin protection and existing public-page language redirects. Actual browser login/save with the owner's password is not automated.

Security advisors introduced no new RLS findings; the pre-existing private inbox notice and disabled leaked-password protection remain documented in [admin setup](admin.md).
