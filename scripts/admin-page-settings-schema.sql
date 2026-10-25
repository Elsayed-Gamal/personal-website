-- Personal website only (cdoaudugbjrkhyhivaaa).
-- Remote migration: admin_about_contact_settings. Existing content is preserved.
alter policy "Owner updates site settings" on public.site_content
using (key in ('ui','home','about','contact') and (select private.is_site_owner()))
with check (key in ('ui','home','about','contact') and (select private.is_site_owner()));
