-- Personal website: bounded admin queries, indexed media references and analytics maintenance.
create function public.list_admin_content(p_page integer default 1, p_size integer default 10, p_kind text default 'article', p_status text default 'all', p_search text default '') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_page is null or p_page not between 1 and 10000 or p_size is null or p_size not between 1 and 50
     or p_kind is null or p_kind not in ('article','project') or p_status is null or p_status not in ('all','published','draft') or p_search is null or length(p_search)>200 then
    raise exception 'Invalid query' using errcode='22023'; end if;
  with candidates as materialized (
    select a.id, a.updated_at, a.published, a.date, null::text as year, 0 as sort_order
    from public.articles a where p_kind='article'
      and (p_status='all' or a.published=(p_status='published'))
      and (btrim(p_search)='' or strpos(lower(a.id),lower(btrim(p_search)))>0 or exists(select 1 from public.article_translations t where t.article_id=a.id and (strpos(lower(t.title),lower(btrim(p_search)))>0 or strpos(lower(t.slug),lower(btrim(p_search)))>0)))
    union all
    select p.slug,p.updated_at,p.published,null::date,p.year,p.sort_order
    from public.projects p where p_kind='project'
      and (p_status='all' or p.published=(p_status='published'))
      and (btrim(p_search)='' or strpos(lower(p.slug),lower(btrim(p_search)))>0 or exists(select 1 from public.project_translations t where t.project_slug=p.slug and strpos(lower(t.title),lower(btrim(p_search)))>0))
  ), page as (
    select * from candidates order by sort_order,date desc,id limit p_size offset (p_page-1)*p_size
  )
  select jsonb_build_object('total',(select count(*) from candidates),
    'items',coalesce((select jsonb_agg(jsonb_build_object('kind',p_kind,'id',p.id,'updated_at',p.updated_at,'published',p.published,'date',p.date,'year',p.year,'sort_order',p.sort_order,
      'translations',case when p_kind='article' then (select jsonb_agg(jsonb_build_object('locale',t.locale,'slug',t.slug,'title',t.title,'published',t.published) order by t.locale) from public.article_translations t where t.article_id=p.id)
      else (select jsonb_agg(jsonb_build_object('locale',t.locale,'title',t.title) order by t.locale) from public.project_translations t where t.project_slug=p.id) end) order by p.sort_order,p.date desc,p.id) from page p),'[]'::jsonb),
    'counts',jsonb_build_object('article',(select count(*) from public.articles),'project',(select count(*) from public.projects),
      'published',case when p_kind='article' then (select count(*) from public.articles where published) else (select count(*) from public.projects where published) end,
      'draft',case when p_kind='article' then (select count(*) from public.articles where not published) else (select count(*) from public.projects where not published) end)) into result;
  return result;
end; $$;
revoke all on function public.list_admin_content(integer,integer,text,text,text) from public,anon;
grant execute on function public.list_admin_content(integer,integer,text,text,text) to authenticated;

create function public.list_admin_messages(p_page integer default 1,p_size integer default 10,p_filter text default 'all',p_search text default '') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_page is null or p_page not between 1 and 10000 or p_size is null or p_size not between 1 and 50 or p_filter is null or p_filter not in ('all','read','unread') or p_search is null or length(p_search)>200 then
    raise exception 'Invalid query' using errcode='22023'; end if;
  with candidates as materialized (
    select id,name,email,left(message,160) as snippet,locale,read_at,created_at from public.messages m
    where (p_filter='all' or (m.read_at is null)=(p_filter='unread'))
      and (btrim(p_search)='' or strpos(lower(m.name),lower(btrim(p_search)))>0 or strpos(lower(m.email),lower(btrim(p_search)))>0 or strpos(lower(m.message),lower(btrim(p_search)))>0)
  ), page as (select * from candidates order by created_at desc,id limit p_size offset (p_page-1)*p_size),
  counts as (select count(*) as all_count,count(*) filter(where read_at is null) as unread,count(*) filter(where read_at is not null) as read from public.messages)
  select jsonb_build_object('total',(select count(*) from candidates),'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from page p),'[]'::jsonb),
    'counts',(select jsonb_build_object('all',all_count,'unread',unread,'read',read) from counts)) into result;
  return result;
end; $$;
revoke all on function public.list_admin_messages(integer,integer,text,text) from public,anon;
grant execute on function public.list_admin_messages(integer,integer,text,text) to authenticated;
create index messages_page_idx on public.messages(created_at desc,id);

-- Extract once when a source row changes, not once per image on every library read.
create table private.content_image_references (
  path text not null, source_table text not null, source_key jsonb not null,
  primary key(path,source_table,source_key)
);
create index content_image_references_source_idx on private.content_image_references(source_table,source_key);
alter table private.content_image_references enable row level security;
revoke all on private.content_image_references from public,anon,authenticated;
grant select on private.content_image_references to authenticated;
create policy "Owner reads image references" on private.content_image_references for select to authenticated using ((select private.is_site_owner()));

create function private.image_paths(payload text) returns table(path text)
language sql immutable security invoker set search_path='' as $$
  select distinct m[1] from regexp_matches(payload,'((?:articles|projects)/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](?:jpg|png|webp))','g') m;
$$;
revoke all on function private.image_paths(text) from public,anon;
grant execute on function private.image_paths(text) to authenticated;

create or replace function private.guard_deleted_content_images() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('content-image-references',0));
  if exists(select 1 from private.image_paths(to_jsonb(new)::text) p join private.content_image_deletions d on d.path=p.path) then
    raise exception 'Image is deleted or pending deletion' using errcode='23503';
  end if;
  return new;
end; $$;

-- Trigger-only definer: callers cannot edit the index or forge another source's references.
create function private.sync_content_image_references() returns trigger
language plpgsql security definer set search_path='' as $$
declare row_value jsonb; source_id jsonb;
begin
  if auth.uid() is not null and not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('content-image-references',0));
  if tg_op in ('DELETE','UPDATE') then
    row_value:=to_jsonb(old);
    source_id:=case tg_table_name
      when 'articles' then jsonb_build_array(row_value->>'id') when 'projects' then jsonb_build_array(row_value->>'slug')
      when 'article_translations' then jsonb_build_array(row_value->>'article_id',row_value->>'locale')
      when 'project_translations' then jsonb_build_array(row_value->>'project_slug',row_value->>'locale')
      when 'site_content' then jsonb_build_array(row_value->>'key',row_value->>'locale') end;
    delete from private.content_image_references where source_table=tg_table_name and source_key=source_id;
  end if;
  if tg_op<>'DELETE' then
    row_value:=to_jsonb(new);
    source_id:=case tg_table_name
      when 'articles' then jsonb_build_array(row_value->>'id') when 'projects' then jsonb_build_array(row_value->>'slug')
      when 'article_translations' then jsonb_build_array(row_value->>'article_id',row_value->>'locale')
      when 'project_translations' then jsonb_build_array(row_value->>'project_slug',row_value->>'locale')
      when 'site_content' then jsonb_build_array(row_value->>'key',row_value->>'locale') end;
    insert into private.content_image_references(path,source_table,source_key) select path,tg_table_name,source_id from private.image_paths(row_value::text);
  end if;
  return null;
end; $$;
revoke all on function private.sync_content_image_references() from public,anon,authenticated;
create trigger articles_sync_images after insert or update or delete on public.articles for each row execute function private.sync_content_image_references();
create trigger projects_sync_images after insert or update or delete on public.projects for each row execute function private.sync_content_image_references();
create trigger article_translations_sync_images after insert or update or delete on public.article_translations for each row execute function private.sync_content_image_references();
create trigger project_translations_sync_images after insert or update or delete on public.project_translations for each row execute function private.sync_content_image_references();
create trigger site_content_sync_images after insert or update or delete on public.site_content for each row execute function private.sync_content_image_references();

insert into private.content_image_references(path,source_table,source_key)
select paths.path,s.source_table,s.source_key from (
  select 'articles' source_table,jsonb_build_array(id) source_key,to_jsonb(a)::text payload from public.articles a
  union all select 'projects',jsonb_build_array(slug),to_jsonb(p)::text from public.projects p
  union all select 'article_translations',jsonb_build_array(article_id,locale),to_jsonb(t)::text from public.article_translations t
  union all select 'project_translations',jsonb_build_array(project_slug,locale),to_jsonb(t)::text from public.project_translations t
  union all select 'site_content',jsonb_build_array(key,locale),to_jsonb(s)::text from public.site_content s
) s cross join lateral private.image_paths(s.payload) paths;
create or replace function private.content_image_in_use(image_path text) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from private.content_image_references where path=image_path);
$$;

-- Exact daily cap, constant-time daily total. Lock only the current day's counter.
create table private.analytics_day_counts(day date primary key,views bigint not null default 0 check(views>=0));
alter table private.analytics_day_counts enable row level security;
revoke all on private.analytics_day_counts from public,anon,authenticated;
insert into private.analytics_day_counts(day,views) select day,sum(views) from public.analytics_daily group by day;
create or replace function private.accept_page_view(p_event_id uuid,p_path text,p_country text) returns boolean
language plpgsql security definer set search_path='' as $$
declare today date:=(now() at time zone 'Africa/Cairo')::date; loc text; segment text; daily_count bigint;
begin
 if p_event_id is null or p_path is null or length(p_path)>250 or p_country is null or p_country !~ '^[A-Z]{2}$' then return false;end if;
 loc:=split_part(p_path,'/',2);
 if loc not in ('ar','en') then return false;end if;
 if p_path not in ('/'||loc,'/'||loc||'/about','/'||loc||'/contact','/'||loc||'/blog','/'||loc||'/work') then
   segment:=split_part(p_path,'/',4);
   if p_path='/'||loc||'/blog/'||segment then
     if not exists(select 1 from public.article_translations t join public.articles a on a.id=t.article_id where t.slug=segment and t.locale=loc and t.published and a.published) then return false;end if;
   elsif p_path='/'||loc||'/work/'||segment then
     if not exists(select 1 from public.projects where slug=segment and published) then return false;end if;
   else return false;end if;
 end if;
 insert into private.analytics_day_counts(day) values(today) on conflict do nothing;
 select views into daily_count from private.analytics_day_counts where day=today for update;
 if exists(select 1 from private.analytics_receipts where event_id=p_event_id) then return true;end if;
 if daily_count>=10000 or (select count(*) from private.analytics_receipts where recorded_at>now()-interval '1 minute')>=600 then return false;end if;
 insert into private.analytics_receipts(event_id) values(p_event_id) on conflict do nothing;
 if not found then return true;end if;
 update private.analytics_day_counts set views=views+1 where day=today;
 insert into public.analytics_daily(day,path,country,views) values(today,p_path,p_country,1)
 on conflict(day,path,country) do update set views=analytics_daily.views+1;
 return true;
end; $$;

create extension if not exists pg_cron with schema pg_catalog;
create function private.cleanup_site_analytics() returns void
language sql security invoker set search_path='' as $$
  delete from private.analytics_receipts where recorded_at<now()-interval '2 days';
  delete from public.analytics_daily where day<(now() at time zone 'Africa/Cairo')::date-400;
  delete from private.analytics_day_counts where day<(now() at time zone 'Africa/Cairo')::date-2;
$$;
revoke all on function private.cleanup_site_analytics() from public,anon,authenticated;
select cron.schedule('personal-website-analytics-cleanup','17 3 * * *','select private.cleanup_site_analytics()');
notify pgrst,'reload schema';
