-- Personal website (cdoaudugbjrkhyhivaaa) only. Applied as content_images.
-- Public assets; uploading and listing require the verified site owner.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('content-images', 'content-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']);

create policy "Owner uploads content images" on storage.objects for insert to authenticated
with check (
  bucket_id = 'content-images' and (select private.is_site_owner())
  and name ~ '^(articles|projects)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$'
);
create policy "Owner reads content image objects" on storage.objects for select to authenticated
using (bucket_id = 'content-images' and (select private.is_site_owner()));
-- No UPDATE/DELETE policy: images are immutable; removing a cover unlinks it.

alter table public.articles
  add column cover_image_path text,
  add column cover_image_alt jsonb not null default '{"ar":"","en":""}',
  add constraint articles_cover_image_path_check check (
    cover_image_path ~ '^articles/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  ),
  add constraint articles_cover_image_alt_check check (
    (jsonb_typeof(cover_image_alt) = 'object'
    and jsonb_typeof(cover_image_alt->'ar') = 'string'
    and jsonb_typeof(cover_image_alt->'en') = 'string'
    and length(cover_image_alt->>'ar') <= 200
    and length(cover_image_alt->>'en') <= 200) is true
  );
alter table public.projects
  add column cover_image_path text,
  add column cover_image_alt jsonb not null default '{"ar":"","en":""}',
  add constraint projects_cover_image_path_check check (
    cover_image_path ~ '^projects/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$'
  ),
  add constraint projects_cover_image_alt_check check (
    (jsonb_typeof(cover_image_alt) = 'object'
    and jsonb_typeof(cover_image_alt->'ar') = 'string'
    and jsonb_typeof(cover_image_alt->'en') = 'string'
    and length(cover_image_alt->>'ar') <= 200
    and length(cover_image_alt->>'en') <= 200) is true
  );

-- Keep the existing atomic save, row locks, version checks and RLS.
create or replace function public.save_site_entry(entry jsonb) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  kind text := entry->>'kind'; item_id text := entry->>'id';
  expected timestamptz := (entry->>'updated_at')::timestamptz;
  current_version timestamptz; new_version timestamptz; t jsonb; is_published boolean := (entry->>'published')::boolean;
  image_path text := entry->>'cover_image_path';
  image_alt jsonb := coalesce(entry->'cover_image_alt', '{"ar":"","en":""}'::jsonb);
begin
  if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  if kind not in ('article','project') or kind is null or nullif(item_id,'') is null
    or is_published is null or jsonb_typeof(entry->'translations') is distinct from 'array' then
    raise exception 'Invalid content' using errcode='22023';
  end if;
  if image_path is not null and (
    image_path !~ ('^' || case when kind='article' then 'articles' else 'projects' end || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$')
    or not exists(select 1 from storage.objects where bucket_id='content-images' and name=image_path)
  ) then raise exception 'Upload the cover image first' using errcode='22023'; end if;
  if jsonb_array_length(entry->'translations') not between 1 and 2 then raise exception 'Invalid translations' using errcode='22023'; end if;
  if (select count(distinct v->>'locale') from jsonb_array_elements(entry->'translations') v) <> jsonb_array_length(entry->'translations')
    or exists(select 1 from jsonb_array_elements(entry->'translations') v where coalesce(v->>'locale','') not in ('ar','en')) then
    raise exception 'Invalid translation locales' using errcode='22023';
  end if;
  if kind='article' then
    if is_published and not exists(select 1 from jsonb_array_elements(entry->'translations') v where (v->>'published')::boolean) then
      raise exception 'No published translation' using errcode='22023';
    end if;
    if expected is null then
      insert into public.articles(id,date,reading_time,category,published,cover_image_path,cover_image_alt)
      values(item_id,(entry->>'date')::date,(entry->>'reading_time')::integer,entry->'category',is_published,image_path,image_alt);
    else
      select updated_at into current_version from public.articles where id=item_id for update;
      if current_version is distinct from expected then raise exception 'Content changed' using errcode='40001'; end if;
      update public.articles set date=(entry->>'date')::date,reading_time=(entry->>'reading_time')::integer,category=entry->'category',published=is_published,
        cover_image_path=case when entry ? 'cover_image_path' then image_path else cover_image_path end,
        cover_image_alt=case when entry ? 'cover_image_alt' then image_alt else cover_image_alt end where id=item_id;
      if exists(select 1 from public.article_translations old join jsonb_array_elements(entry->'translations') v on old.locale=v->>'locale'
        where old.article_id=item_id and old.slug is distinct from v->>'slug') then
        raise exception 'Existing slugs are immutable' using errcode='22023';
      end if;
    end if;
    delete from public.article_translations where article_id=item_id;
    for t in select * from jsonb_array_elements(entry->'translations') loop
      if is_published and (t->>'published')::boolean and
        (nullif(btrim(t->>'title'),'') is null or nullif(btrim(t->>'excerpt'),'') is null or nullif(btrim(t->>'body'),'') is null) then
        raise exception 'Incomplete published translation' using errcode='22023';
      end if;
      insert into public.article_translations(article_id,locale,slug,title,excerpt,body,published)
      values(item_id,t->>'locale',t->>'slug',t->>'title',t->>'excerpt',t->>'body',(t->>'published')::boolean);
    end loop;
    select updated_at into new_version from public.articles where id=item_id;
  else
    if is_published and jsonb_array_length(entry->'translations')<>2 then raise exception 'Both project translations required' using errcode='22023'; end if;
    if expected is null then
      insert into public.projects(slug,sort_order,year,color,stack,published,cover_image_path,cover_image_alt)
      values(item_id,(entry->>'sort_order')::integer,entry->>'year',entry->>'color',array(select jsonb_array_elements_text(entry->'stack')),is_published,image_path,image_alt);
    else
      select updated_at into current_version from public.projects where slug=item_id for update;
      if current_version is distinct from expected then raise exception 'Content changed' using errcode='40001'; end if;
      update public.projects set sort_order=(entry->>'sort_order')::integer,year=entry->>'year',color=entry->>'color',stack=array(select jsonb_array_elements_text(entry->'stack')),published=is_published,
        cover_image_path=case when entry ? 'cover_image_path' then image_path else cover_image_path end,
        cover_image_alt=case when entry ? 'cover_image_alt' then image_alt else cover_image_alt end where slug=item_id;
    end if;
    delete from public.project_translations where project_slug=item_id;
    for t in select * from jsonb_array_elements(entry->'translations') loop
      if is_published and
        (nullif(btrim(t->>'title'),'') is null or nullif(btrim(t->>'summary'),'') is null or nullif(btrim(t->>'body'),'') is null or nullif(btrim(t->>'category'),'') is null) then
        raise exception 'Incomplete project translation' using errcode='22023';
      end if;
      insert into public.project_translations(project_slug,locale,title,summary,body,category)
      values(item_id,t->>'locale',t->>'title',t->>'summary',t->>'body',t->>'category');
    end loop;
    select updated_at into new_version from public.projects where slug=item_id;
  end if;
  return new_version;
end;
$$;
revoke all on function public.save_site_entry(jsonb) from public, anon;
grant execute on function public.save_site_entry(jsonb) to authenticated;
notify pgrst,'reload schema';
