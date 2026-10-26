-- All fixtures and counters are rolled back; no notifications or files are sent.
begin;
select set_config('test.perf_id','performance-'||gen_random_uuid()::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated')::text,true)
from auth.users where lower(email)='eheeba@gmail.com' and email_confirmed_at is not null;
set local role authenticated;
do $$
declare d jsonb; identifier text:=current_setting('test.perf_id'); i integer; image_path text:='articles/00000000-0000-4000-8000-000000000099.png';
begin
  for i in 1..13 loop
    insert into public.articles(id,date,reading_time,category,published) values(identifier||'-'||i,current_date,3,'{"ar":"تجربة","en":"Test"}',false);
    insert into public.article_translations(article_id,locale,slug,title,excerpt,body,published) values(identifier||'-'||i,'ar',identifier||'-'||i,identifier||' title '||i,'excerpt',repeat('private body ',5000),false);
  end loop;
  d:=public.list_admin_content(1,10,'article','draft',identifier);
  if (d->>'total')::int<>13 or jsonb_array_length(d->'items')<>10 then raise exception 'Content pagination failed'; end if;
  if d::text like '%private body%' then raise exception 'Body leaked into summary'; end if;
  d:=public.list_admin_content(2,10,'article','draft',identifier);
  if jsonb_array_length(d->'items')<>3 then raise exception 'Second page failed'; end if;
  if jsonb_array_length(public.list_admin_content(1,10,'article','published',identifier)->'items')<>0 then raise exception 'Status filter failed'; end if;
  if (public.list_admin_content(1,10,'article','draft',identifier||'-13')->>'total')::int<>1 then raise exception 'Slug search failed'; end if;
  update public.article_translations set body=image_path where article_id=identifier||'-1';
  if not private.content_image_in_use(image_path) then raise exception 'Reference missing'; end if;
  delete from public.articles where id=identifier||'-1';
  if private.content_image_in_use(image_path) then raise exception 'Cascade left stale reference'; end if;
  begin perform public.list_admin_content(1,500,'article','all',''); raise exception 'Unbounded query accepted'; exception when invalid_parameter_value then null; end;
  begin delete from private.content_image_references; raise exception 'Reference tampering allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.messages(name,email,message,locale)
select current_setting('test.perf_id'),'perf@example.com',current_setting('test.perf_id')||repeat(' body',600),'en' from generate_series(1,12);
set local role authenticated;
do $$ declare d jsonb; begin
 d:=public.list_admin_messages(1,10,'unread',current_setting('test.perf_id'));
 if (d->>'total')::int<>12 or jsonb_array_length(d->'items')<>10 then raise exception 'Message pagination failed'; end if;
 if exists(select 1 from jsonb_array_elements(d->'items') x where length(x->>'snippet')>160 or x ? 'message') then raise exception 'Message summary not bounded'; end if;
 if jsonb_array_length(public.list_admin_messages(2,10,'unread',current_setting('test.perf_id'))->'items')<>2 then raise exception 'Message second page failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
 begin perform public.list_admin_content(); raise exception 'Anonymous content access'; exception when insufficient_privilege then null; end;
 begin perform public.list_admin_messages(); raise exception 'Anonymous inbox access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin perform public.list_admin_content(); raise exception 'Nonowner content access'; exception when insufficient_privilege then null; end;
 begin perform public.list_admin_messages(); raise exception 'Nonowner inbox access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: bounded pagination, full-text-body exclusion, literal search, filters, reference cascade and permissions' as result;
