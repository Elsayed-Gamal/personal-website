-- Personal website only (cdoaudugbjrkhyhivaaa).
-- Data initialization, not a schema migration. Existing SEO values take precedence.
-- Blank fields retain the application's existing metadata fallbacks.
update public.site_content
set value = jsonb_set(
  value,
  '{seo}',
  '{"title":"","description":"","siteUrl":"","imageUrl":"","imageAlt":"","twitterHandle":""}'::jsonb
    || coalesce(value->'seo', '{}'::jsonb),
  true
)
where key = 'ui'
  and locale in ('ar', 'en')
  and (
    not (value ? 'seo')
    or (
      jsonb_typeof(value->'seo') = 'object'
      and not ((value->'seo') ?& array['title','description','siteUrl','imageUrl','imageAlt','twitterHandle'])
    )
  )
returning key, locale, value->'seo' as seo, updated_at;
