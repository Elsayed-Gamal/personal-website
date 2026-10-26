# Contact form and private inbox

The Arabic and English contact pages submit name, email and message to the private inbox at `/admin/messages`. Form labels and feedback come from the existing `site_content.contact` rows. The old inactive-contact placeholder has been replaced by the form. A successful database submission atomically queues an owner notification; a private scheduled worker sends it through Resend when Vault configuration is present. The form does not wait for the email provider. The administrator's Reply link opens their mail application, and the notification itself uses the visitor address as `Reply-To`.

The form validates name (2–100 characters), email (up to 254), message (10–5000), locale, and a UUID request identifier. Failed submissions retain input and the retry identifier; success clears the form when starting another message. Next.js Server Actions provide same-origin request handling. A honeypot silently discards obvious automated submissions.

## Database boundary

Only **Personal website** (`cdoaudugbjrkhyhivaaa`) was changed. Migration `contact_inbox` was applied through the Supabase migration API; exact SQL is archived in `scripts/contact-inbox-schema.sql`. Do not replay it.

Public callers have no SELECT or direct INSERT/UPDATE/DELETE permission on `messages`. The application uses `public.submit_contact_queued`, a SECURITY INVOKER wrapper around non-exposed `private.accept_contact_queued`. The original `public.submit_contact` remains compatible for older deployed clients. The private helper intentionally uses SECURITY DEFINER because unauthenticated visitors must submit without obtaining table privileges. Its empty search path, parameter validation, fixed insert operation and database-enforced limits bound that privilege. It returns a status, never inbox data or a message ID. No service-role key is used by the application.

The helper uses a transaction advisory lock to serialize duplicate/rate checks and inserts, preventing concurrent bypass. Limits are 60 accepted messages per hour globally, 3 per email per hour, and 30 seconds between different messages from one email. This is basic throttling, not proof of humanity: a determined attacker can consume the shared quota. A CAPTCHA and trusted infrastructure-level IP limiting can be added for higher-volume exposure.

`private.contact_receipts` stores only request IDs, SHA-256 email/payload hashes and timestamps, with RLS enabled and all table privileges revoked from client roles. Duplicate requests or identical payloads return success without another message. Reusing a request ID for different text is rejected. Receipts are independent of the inbox, so deleting a message does not make a retry recreate it. Receipts older than 24 hours are removed on the next valid submission, not by a scheduled job. Email addresses are visitor-supplied, not verified.

## Email notifications

The scheduled worker reads three Supabase Vault secrets: `site_contact_resend_key`, `site_contact_sender`, and `site_contact_recipient`. They were initialized from the existing server configuration; no secret is stored in migrations or client code. Rotate these Vault entries when changing the key or notification addresses. The sender must belong to a domain verified in Resend. The legacy `RESEND_API_KEY` / `CONTACT_NOTIFICATION_FROM` / `CONTACT_NOTIFICATION_TO` environment settings are only used by the old direct-email helper, which the current Server Action no longer invokes.

Notifications are plain text, include the submitted message and use the visitor address as `Reply-To`. The worker uses `contact-message/<message UUID>` as the Resend idempotency key. The `personal-website-contact-notifications` job runs once per minute, dispatches up to 10 notifications per run, and retries failures with exponential backoff for at most six attempts. Lost HTTP responses are recovered after five minutes; successful jobs are removed after seven days, while exhausted jobs remain for diagnosis. Database storage is authoritative: a missing configuration or Resend outage never changes a successfully stored contact submission into a visitor-facing failure. No automatic reply is sent to the visitor.

Only the owner can read/delete inbox rows and update the `read_at` column; submitted name/email/body cannot be rewritten by the admin application. Every admin loader/action also checks `requireAdmin()`. The inbox supports search, status filters, pagination, read/unread changes, refreshing and confirmed deletion. Text is rendered as plain escaped text, not HTML. Search, filters, counts and pagination run in the owner-authorized `list_admin_messages` RPC. Each page contains 10 summaries with a 160-character snippet; the full message is fetched only when opened.

Incremental migration `durable_contact_notifications` adds the outbox, receipt-to-message link, `pg_net` worker and cron schedule. See `supabase/migrations/20261026083011_durable_contact_notifications.sql`. The queue and worker are inaccessible to API roles. Deleting an inbox message also removes its pending notification.

## Verification

`tests/integration/contact-outbox.sql` verifies atomic enqueueing, deduplication, permissions and simulated HTTP failure/retry/success inside a rollback-only transaction; no real email is sent by the test.

`tests/integration/contact-inbox.sql` tests actual anonymous submission, invalid inputs, idempotency, throttling, anonymous/non-owner privacy, owner read-state/delete, column restrictions and receipt survival after deletion, all inside a rollback-only transaction. No fixtures remain. Unit/component tests cover input normalization, validation, error states, retry identity, authorization and inbox interactions. Browser tests cover both contact locales on mobile, native validation and the honeypot Server Action without storing messages.

Supabase's advisor reports the intentional closed RLS table `private.contact_receipts` without policies ([explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)). The existing disabled leaked-password protection notice remains unrelated to this feature ([configuration](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
