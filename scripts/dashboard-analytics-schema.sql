-- Personal website only. Migration dashboard_analytics.
create table public.analytics_daily (
 day date not null, path text not null, country text not null,
 views bigint not null default 0 check(views>=0),
 primary key(day,path,country),
 check(country ~ '^[A-Z]{2}$' or country='ZZ')
);
alter table public.analytics_daily enable row level security;
revoke all on public.analytics_daily from public,anon,authenticated;
grant select on public.analytics_daily to authenticated;
create policy "Owner reads analytics" on public.analytics_daily for select to authenticated using ((select private.is_site_owner()));
create table private.analytics_receipts(event_id uuid primary key,recorded_at timestamptz not null default now());
alter table private.analytics_receipts enable row level security;
revoke all on private.analytics_receipts from public,anon,authenticated;
create index analytics_receipts_time_idx on private.analytics_receipts(recorded_at);
create function private.accept_page_view(p_event_id uuid,p_path text,p_country text) returns boolean
language plpgsql security definer set search_path=''
as $$
declare today date:=(now() at time zone 'Africa/Cairo')::date; loc text; segment text;
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
 perform pg_advisory_xact_lock(8145072302);
 delete from private.analytics_receipts where recorded_at<now()-interval '2 days';
 delete from public.analytics_daily where day<today-400;
 if exists(select 1 from private.analytics_receipts where event_id=p_event_id) then return true;end if;
 if (select count(*) from private.analytics_receipts where recorded_at>now()-interval '1 minute')>=600
   or (select coalesce(sum(views),0) from public.analytics_daily where day=today)>=10000 then return false;end if;
 insert into private.analytics_receipts(event_id) values(p_event_id);
 insert into public.analytics_daily(day,path,country,views) values(today,p_path,p_country,1)
 on conflict(day,path,country) do update set views=analytics_daily.views+1;
 return true;
end;$$;
revoke all on function private.accept_page_view(uuid,text,text) from public,anon,authenticated;
grant execute on function private.accept_page_view(uuid,text,text) to anon,authenticated;
create function public.record_page_view(p_event_id uuid,p_path text,p_country text) returns boolean
language sql security invoker set search_path=''
as $$ select private.accept_page_view(p_event_id,p_path,p_country);$$;
revoke all on function public.record_page_view(uuid,text,text) from public,anon,authenticated;
grant execute on function public.record_page_view(uuid,text,text) to anon,authenticated;

create function public.get_dashboard(p_days integer default 30) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare today date:=(now() at time zone 'Africa/Cairo')::date; start_day date; result jsonb;
begin
 if not private.is_site_owner() then raise exception 'Forbidden' using errcode='42501';end if;
 if p_days is null or p_days not in(7,30,90) then raise exception 'Invalid range' using errcode='22023';end if;
 start_day:=today-p_days+1;
 select jsonb_build_object(
 'generated_at',now(),'days',p_days,'start_day',start_day,'end_day',today,
 'articles',jsonb_build_object('total',(select count(*) from public.articles),'published',(select count(*) from public.articles where published)),
 'projects',jsonb_build_object('total',(select count(*) from public.projects),'published',(select count(*) from public.projects where published)),
 'messages',jsonb_build_object('total',(select count(*) from public.messages),'unread',(select count(*) from public.messages where read_at is null),'period',(select count(*) from public.messages where created_at >= start_day::timestamp at time zone 'Africa/Cairo')),
 'views',(select coalesce(sum(views),0) from public.analytics_daily where day between start_day and today),
 'previous_views',(select coalesce(sum(views),0) from public.analytics_daily where day>=start_day-p_days and day<start_day),
 'known_country_views',(select coalesce(sum(views),0) from public.analytics_daily where day between start_day and today and country<>'ZZ'),
 'daily',(select jsonb_agg(jsonb_build_object('day',d::date,'views',coalesce(v.n,0)) order by d) from generate_series(start_day::timestamp,today::timestamp,interval '1 day') d left join (select day,sum(views) n from public.analytics_daily where day between start_day and today group by day) v on v.day=d::date),
 'countries',coalesce((select jsonb_agg(to_jsonb(c)) from (select country,sum(views) views from public.analytics_daily where day between start_day and today group by country order by sum(views) desc,country limit 8)c),'[]'::jsonb),
 'pages',coalesce((select jsonb_agg(to_jsonb(p)) from(select path,sum(views) views from public.analytics_daily where day between start_day and today group by path order by sum(views) desc,path limit 8)p),'[]'::jsonb),
 'recent_messages',coalesce((select jsonb_agg(to_jsonb(m)) from(select id,name,created_at,read_at from public.messages order by created_at desc,id limit 5)m),'[]'::jsonb),
 'recent_content',coalesce((select jsonb_agg(to_jsonb(c)) from(
  select 'article' kind,a.id,a.published,a.updated_at,coalesce((select t.title from public.article_translations t where t.article_id=a.id order by t.locale limit 1),'بدون عنوان') title from public.articles a
  union all select 'project',p.slug,p.published,p.updated_at,coalesce((select t.title from public.project_translations t where t.project_slug=p.slug order by t.locale limit 1),'بدون عنوان') from public.projects p
  order by updated_at desc,id limit 5)c),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function public.get_dashboard(integer) from public,anon,authenticated;
grant execute on function public.get_dashboard(integer) to authenticated;
notify pgrst,'reload schema';
