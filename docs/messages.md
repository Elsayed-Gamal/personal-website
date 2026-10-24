# Contact form and private inbox

The Arabic and English contact pages submit name, email and message to the private inbox at `/admin/messages`. Form labels and feedback come from the existing `site_content.contact` rows. The old inactive-contact placeholder has been replaced by the form. After a successful database submission, Resend sends an owner notification when its server-only configuration is present. The administrator's Reply link opens their mail application, and the notification itself uses the visitor address as `Reply-To`.

The form validates name (2–100 characters), email (up to 254), message (10–5000), locale, and a UUID request identifier. Failed submissions retain input and the retry identifier; success clears the form when starting another message. Next.js Server Actions provide same-origin request handling. A honeypot silently discards obvious automated submissions.

## Database boundary

Only **Personal website** (`cdoaudugbjrkhyhivaaa`) was changed. Migration `contact_inbox` was applied through the Supabase migration API; exact SQL is archived in `scripts/contact-inbox-schema.sql`. Do not replay it.

Public callers have no SELECT or direct INSERT/UPDATE/DELETE permission on `messages`. Their only insertion path is `public.submit_contact`, a SECURITY INVOKER wrapper around non-exposed `private.accept_contact`. The private helper intentionally uses SECURITY DEFINER because unauthenticated visitors must submit without obtaining table privileges. Its empty search path, parameter validation, fixed insert operation and database-enforced limits bound that privilege. It returns a status, never inbox data or a message ID. No service-role key is used by the application.

The helper uses a transaction advisory lock to serialize duplicate/rate checks and inserts, preventing concurrent bypass. Limits are 60 accepted messages per hour globally, 3 per email per hour, and 30 seconds between different messages from one email. This is basic throttling, not proof of humanity: a determined attacker can consume the shared quota. A CAPTCHA and trusted infrastructure-level IP limiting can be added for higher-volume exposure.

`private.contact_receipts` stores only request IDs, SHA-256 email/payload hashes and timestamps, with RLS enabled and all table privileges revoked from client roles. Duplicate requests or identical payloads return success without another message. Reusing a request ID for different text is rejected. Receipts are independent of the inbox, so deleting a message does not make a retry recreate it. Receipts older than 24 hours are removed on the next valid submission, not by a scheduled job. Email addresses are visitor-supplied, not verified.

## Email notifications

Set `RESEND_API_KEY` and `CONTACT_NOTIFICATION_FROM` in the deployment environment. The sender must belong to a domain verified in Resend. `CONTACT_NOTIFICATION_TO` is optional and falls back to `SUPABASE_ADMIN_EMAIL`. All three settings are server-only and must never use a `NEXT_PUBLIC_` prefix.

Notifications are plain text, include the submitted message and use the visitor address as `Reply-To`. The stable form request UUID is also passed to Resend as an idempotency key, preventing a browser retry from sending the same notification twice during Resend's idempotency window. Database storage is authoritative: a missing configuration or Resend outage never changes a successfully stored contact submission into a visitor-facing failure. No automatic reply is sent to the visitor.

Only the owner can read/delete inbox rows and update the `read_at` column; submitted name/email/body cannot be rewritten by the admin application. Every admin loader/action also checks `requireAdmin()`. The inbox supports search, status filters, pagination, read/unread changes, refreshing and confirmed deletion. Text is rendered as plain escaped text, not HTML. Data is loaded in server batches; for a much larger inbox, move the client search and pagination to server queries.

## Verification

`tests/integration/contact-inbox.sql` tests actual anonymous submission, invalid inputs, idempotency, throttling, anonymous/non-owner privacy, owner read-state/delete, column restrictions and receipt survival after deletion, all inside a rollback-only transaction. No fixtures remain. Unit/component tests cover input normalization, validation, error states, retry identity, authorization and inbox interactions. Browser tests cover both contact locales on mobile, native validation and the honeypot Server Action without storing messages.

Supabase's advisor reports the intentional closed RLS table `private.contact_receipts` without policies ([explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)). The existing disabled leaked-password protection notice remains unrelated to this feature ([configuration](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
