-- Personal website only. Incremental migration: media_library.
alter table public.articles add column cover_image_url text,
  drop constraint articles_cover_image_path_check,
  add constraint articles_cover_image_path_check check (cover_image_path ~ '^(articles|projects)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$'),
  add constraint articles_cover_image_source_check check (cover_image_path is null or cover_image_url is null),
  add constraint articles_cover_image_url_check check (length(cover_image_url)<=2000 and cover_image_url ~ '^https://[^/@[:space:]?#]+([/?#][^[:space:]]*)?$');
alter table public.projects add column cover_image_url text,
  drop constraint projects_cover_image_path_check,
  add constraint projects_cover_image_path_check check (cover_image_path ~ '^(articles|projects)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$'),
  add constraint projects_cover_image_source_check check (cover_image_path is null or cover_image_url is null),
  add constraint projects_cover_image_url_check check (length(cover_image_url)<=2000 and cover_image_url ~ '^https://[^/@[:space:]?#]+([/?#][^[:space:]]*)?$');

-- A durable reservation prevents reuse between checking references and removing
-- the Storage object. Keep reservations on ambiguous network failures for retry.
create table private.content_image_deletions (
  path text primary key,
  requested_at timestamptz not null default now(),
  constraint content_image_deletions_path_check check (path ~ '^(articles|projects)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$')
);
alter table private.content_image_deletions enable row level security;
grant select,insert on private.content_image_deletions to authenticated;
create policy "Owner reads image deletion reservations" on private.content_image_deletions for select to authenticated using ((select private.is_site_owner()));
create policy "Owner reserves image deletion" on private.content_image_deletions for insert to authenticated with check ((select private.is_site_owner()));

create function private.content_image_in_use(image_path text) returns boolean
language sql stable security invoker set search_path=''
as $$
  select exists(select 1 from public.articles a where position(image_path in to_jsonb(a)::text)>0)
    or exists(select 1 from public.projects p where position(image_path in to_jsonb(p)::text)>0)
    or exists(select 1 from public.article_translations t where position(image_path in to_jsonb(t)::text)>0)
    or exists(select 1 from public.project_translations t where position(image_path in to_jsonb(t)::text)>0)
    or exists(select 1 from public.site_content s where position(image_path in s.value::text)>0);
$$;
revoke all on function private.content_image_in_use(text) from public,anon;
grant execute on function private.content_image_in_use(text) to authenticated;

create function private.guard_deleted_content_images() returns trigger
language plpgsql security invoker set search_path=''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('content-image-references',0));
  if exists(select 1 from private.content_image_deletions d where position(d.path in to_jsonb(new)::text)>0) then
    raise exception 'Image is deleted or pending deletion' using errcode='23503';
  end if;
  return new;
end; $$;
revoke all on function private.guard_deleted_content_images() from public,anon;
grant execute on function private.guard_deleted_content_images() to authenticated;
create trigger articles_image_references before insert or update on public.articles for each row execute function private.guard_deleted_content_images();
create trigger projects_image_references before insert or update on public.projects for each row execute function private.guard_deleted_content_images();
create trigger article_translations_image_references before insert or update on public.article_translations for each row execute function private.guard_deleted_content_images();
create trigger project_translations_image_references before insert or update on public.project_translations for each row execute function private.guard_deleted_content_images();
create trigger site_content_image_references before insert or update on public.site_content for each row execute function private.guard_deleted_content_images();

create function public.prepare_content_image_deletion(image_path text) returns void
language plpgsql security invoker set search_path=''
as $$
begin
  if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  if image_path is null or image_path !~ '^(articles|projects)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$' then
    raise exception 'Invalid image path' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('content-image-references',0));
  if private.content_image_in_use(image_path) then raise exception 'Image is in use' using errcode='23503'; end if;
  insert into private.content_image_deletions(path) values(image_path) on conflict do nothing;
end; $$;
revoke all on function public.prepare_content_image_deletion(text) from public,anon;
grant execute on function public.prepare_content_image_deletion(text) to authenticated;

create policy "Owner deletes reserved unused content images" on storage.objects for delete to authenticated
using (bucket_id='content-images' and (select private.is_site_owner())
  and exists(select 1 from private.content_image_deletions d where d.path=name)
  and not private.content_image_in_use(name));

create function public.list_content_images(page_offset integer default 0, page_size integer default 25, folder text default 'all')
returns table(path text,created_at timestamptz,bytes bigint,in_use boolean,deleting boolean)
language plpgsql security invoker set search_path=''
as $$
begin
  if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  if page_offset is null or page_offset<0 or page_offset>240000 or page_size is null or page_size not between 1 and 25 or folder is null or folder not in ('all','articles','projects') then
    raise exception 'Invalid pagination' using errcode='22023';
  end if;
  return query select o.name,o.created_at,(o.metadata->>'size')::bigint,
    private.content_image_in_use(o.name), exists(select 1 from private.content_image_deletions d where d.path=o.name)
  from storage.objects o
  where o.bucket_id='content-images' and o.name ~ '^(articles|projects)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$'
    and (folder='all' or split_part(o.name,'/',1)=folder)
  order by o.created_at desc,o.id desc limit page_size offset page_offset;
end; $$;
revoke all on function public.list_content_images(integer,integer,text) from public,anon;
grant execute on function public.list_content_images(integer,integer,text) to authenticated;

create or replace function public.save_site_entry(entry jsonb) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  kind text := entry->>'kind'; item_id text := entry->>'id';
  expected timestamptz := (entry->>'updated_at')::timestamptz;
  current_version timestamptz; new_version timestamptz; t jsonb; is_published boolean := (entry->>'published')::boolean;
  image_path text := entry->>'cover_image_path';
  image_url text := entry->>'cover_image_url';
  image_alt jsonb := coalesce(entry->'cover_image_alt', '{"ar":"","en":""}'::jsonb);
begin
  if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  if kind not in ('article','project') or kind is null or nullif(item_id,'') is null
    or is_published is null or jsonb_typeof(entry->'translations') is distinct from 'array' then
    raise exception 'Invalid content' using errcode='22023';
  end if;
  if image_path is not null and (
    image_path !~ '^(articles|projects)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$'
    or not exists(select 1 from storage.objects where bucket_id='content-images' and name=image_path)
  ) then raise exception 'Upload the cover image first' using errcode='23503'; end if;
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
      insert into public.articles(id,date,reading_time,category,published,cover_image_path,cover_image_alt,cover_image_url)
      values(item_id,(entry->>'date')::date,(entry->>'reading_time')::integer,entry->'category',is_published,image_path,image_alt,image_url);
    else
      select updated_at into current_version from public.articles where id=item_id for update;
      if current_version is distinct from expected then raise exception 'Content changed' using errcode='40001'; end if;
      update public.articles set date=(entry->>'date')::date,reading_time=(entry->>'reading_time')::integer,category=entry->'category',published=is_published,
        cover_image_path=case when entry ? 'cover_image_path' then image_path else cover_image_path end,
        cover_image_url=case when entry ? 'cover_image_url' then image_url when image_path is not null then null else cover_image_url end,
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
      insert into public.projects(slug,sort_order,year,color,stack,published,cover_image_path,cover_image_alt,cover_image_url)
      values(item_id,(entry->>'sort_order')::integer,entry->>'year',entry->>'color',array(select jsonb_array_elements_text(entry->'stack')),is_published,image_path,image_alt,image_url);
    else
      select updated_at into current_version from public.projects where slug=item_id for update;
      if current_version is distinct from expected then raise exception 'Content changed' using errcode='40001'; end if;
      update public.projects set sort_order=(entry->>'sort_order')::integer,year=entry->>'year',color=entry->>'color',stack=array(select jsonb_array_elements_text(entry->'stack')),published=is_published,
        cover_image_path=case when entry ? 'cover_image_path' then image_path else cover_image_path end,
        cover_image_url=case when entry ? 'cover_image_url' then image_url when image_path is not null then null else cover_image_url end,
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

