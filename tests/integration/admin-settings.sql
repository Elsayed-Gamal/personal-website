-- Rollback-only authorization and concurrency checks; Personal website only.
begin;
select set_config('request.jwt.claims', jsonb_build_object('sub',id,'role','authenticated')::text, true) from auth.users where lower(email)='eheeba@gmail.com' and email_confirmed_at is not null;
set local role authenticated;
do $$
declare n integer; version timestamptz;
begin
  if not private.is_site_owner() then raise exception 'Owner lookup failed'; end if;
  select updated_at into version from public.site_content where key='ui' and locale='ar';
  update public.site_content set value=value where key='ui' and locale='ar' and updated_at=version;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Owner update failed'; end if;
  update public.site_content set value=value where key='ui' and locale='ar' and updated_at=version;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Stale update was accepted'; end if;
  update public.site_content set value=value where key='home' and locale='en';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'English home update failed'; end if;
  update public.site_content set value=value where key='about';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Out-of-scope update accepted'; end if;
  begin
    update public.site_content set key='about' where key='ui' and locale='ar';
    raise exception 'Identity column mutation accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","email":"eheeba@gmail.com","user_metadata":{"role":"admin"}}',true);
set local role authenticated;
do $$ declare n integer; begin
  update public.site_content set value=value where key in ('ui','home');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Non-owner update accepted'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    update public.site_content set value=value where key='ui' and locale='ar';
    raise exception 'Anonymous update accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'passed: owner updates, stale writes denied, other keys denied, identity columns denied, non-owner denied, anonymous denied; all changes rolled back' as result;
