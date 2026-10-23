-- Personal website only; migration admin_content_management.
grant select, insert, update, delete on public.articles, public.article_translations, public.projects, public.project_translations to authenticated;
create policy "Owner manages articles" on public.articles for all to authenticated using ((select private.is_site_owner())) with check ((select private.is_site_owner()));
create policy "Owner manages article translations" on public.article_translations for all to authenticated using ((select private.is_site_owner())) with check ((select private.is_site_owner()));
create policy "Owner manages projects" on public.projects for all to authenticated using ((select private.is_site_owner())) with check ((select private.is_site_owner()));
create policy "Owner manages project translations" on public.project_translations for all to authenticated using ((select private.is_site_owner())) with check ((select private.is_site_owner()));
create trigger articles_updated_at before update on public.articles for each row execute function private.touch_site_content();
create trigger projects_updated_at before update on public.projects for each row execute function private.touch_site_content();

-- SECURITY INVOKER: caller's RLS remains in effect throughout the transaction.
create function public.save_site_entry(entry jsonb) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  kind text := entry->>'kind'; item_id text := entry->>'id';
  expected timestamptz := (entry->>'updated_at')::timestamptz;
  current_version timestamptz; new_version timestamptz; t jsonb; is_published boolean := (entry->>'published')::boolean;
begin
  if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  if kind not in ('article','project') or kind is null or nullif(item_id,'') is null
    or is_published is null or jsonb_typeof(entry->'translations') is distinct from 'array' then
    raise exception 'Invalid content' using errcode='22023';
  end if;
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
      insert into public.articles(id,date,reading_time,category,published)
      values(item_id,(entry->>'date')::date,(entry->>'reading_time')::integer,entry->'category',is_published);
    else
      select updated_at into current_version from public.articles where id=item_id for update;
      if current_version is distinct from expected then raise exception 'Content changed' using errcode='40001'; end if;
      update public.articles set date=(entry->>'date')::date,reading_time=(entry->>'reading_time')::integer,category=entry->'category',published=is_published where id=item_id;
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
      insert into public.projects(slug,sort_order,year,color,stack,published)
      values(item_id,(entry->>'sort_order')::integer,entry->>'year',entry->>'color',array(select jsonb_array_elements_text(entry->'stack')),is_published);
    else
      select updated_at into current_version from public.projects where slug=item_id for update;
      if current_version is distinct from expected then raise exception 'Content changed' using errcode='40001'; end if;
      update public.projects set sort_order=(entry->>'sort_order')::integer,year=entry->>'year',color=entry->>'color',stack=array(select jsonb_array_elements_text(entry->'stack')),published=is_published where slug=item_id;
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

create function public.delete_site_entry(entry_kind text, entry_id text, expected_version timestamptz) returns void
language plpgsql security invoker set search_path = ''
as $$
declare n integer;
begin
  if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  if entry_kind='article' then
    delete from public.articles where id=entry_id and updated_at=expected_version;
  elsif entry_kind='project' then
    delete from public.projects where slug=entry_id and updated_at=expected_version;
  else raise exception 'Invalid kind' using errcode='22023';
  end if;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Content changed' using errcode='40001'; end if;
end; $$;
revoke all on function public.delete_site_entry(text,text,timestamptz) from public, anon;
grant execute on function public.delete_site_entry(text,text,timestamptz) to authenticated;
notify pgrst,'reload schema';
