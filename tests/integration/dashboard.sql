-- Personal website only. Fixtures and aggregate increments are rolled back.
begin;
select set_config('test.analytics_event',gen_random_uuid()::text,true);
select set_config('test.analytics_before',(select coalesce(sum(views),0)::text from public.analytics_daily),true);
set local role anon;
do $$ begin
 if not public.record_page_view(current_setting('test.analytics_event')::uuid,'/ar','EG') then raise exception 'Recording failed';end if;
 if not public.record_page_view(current_setting('test.analytics_event')::uuid,'/ar','EG') then raise exception 'Retry failed';end if;
 if public.record_page_view(gen_random_uuid(),'/admin/dashboard','EG') then raise exception 'Admin path accepted';end if;
 if public.record_page_view(gen_random_uuid(),'/en/blog/missing-analytics-fixture','US') then raise exception 'Nonexistent article accepted';end if;
 if public.record_page_view(gen_random_uuid(),'/ar?email=private@example.com','EG') then raise exception 'Query data accepted';end if;
 begin perform * from public.analytics_daily;raise exception 'Anonymous analytics read';exception when insufficient_privilege then null;end;
 begin perform public.get_dashboard(7);raise exception 'Anonymous dashboard read';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if (select coalesce(sum(views),0) from public.analytics_daily)<>current_setting('test.analytics_before')::bigint+1 then raise exception 'Event double counted';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","email":"eheeba@gmail.com"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.analytics_daily) then raise exception 'Nonowner analytics read';end if;
 begin perform public.get_dashboard(30);raise exception 'Nonowner dashboard read';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated')::text,true) from auth.users where lower(email)='eheeba@gmail.com' and email_confirmed_at is not null;
set local role authenticated;
do $$ declare d jsonb;n integer;begin
 foreach n in array array[7,30,90] loop
  d:=public.get_dashboard(n);
  if jsonb_array_length(d->'daily')<>n then raise exception 'Missing zero-filled days';end if;
  if (d->>'views')::bigint<1 then raise exception 'Views missing';end if;
  if (d->'articles'->>'total')::bigint<>(select count(*) from public.articles) then raise exception 'Wrong article total';end if;
  if (d->'messages'->>'unread')::bigint<>(select count(*) from public.messages where read_at is null) then raise exception 'Wrong unread total';end if;
 end loop;
 begin perform public.get_dashboard(10000);raise exception 'Unbounded range accepted';exception when invalid_parameter_value then null;end;
end $$;
reset role;
rollback;
select 'passed: page-view recording/deduplication, restricted routes, anonymous and nonowner denial, owner aggregates, date ranges and zero-filled days; rolled back' as result;
