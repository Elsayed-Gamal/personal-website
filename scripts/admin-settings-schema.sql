-- Personal website only. Applied via Supabase migration API: admin_site_settings.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
-- Private identity lookup: no user-controlled metadata, no public RPC.
create function private.is_site_owner() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and lower(u.email) = 'eheeba@gmail.com'
      and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until < now())
  );
$$;
revoke all on function private.is_site_owner() from public, anon, authenticated;
grant execute on function private.is_site_owner() to authenticated;

grant update(value) on public.site_content to authenticated;
create policy "Owner updates site settings" on public.site_content
for update to authenticated
using (key in ('ui','home') and (select private.is_site_owner()))
with check (key in ('ui','home') and (select private.is_site_owner()));

create function private.touch_site_content() returns trigger
language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at = clock_timestamp(); return new; end; $$;
revoke all on function private.touch_site_content() from public, anon, authenticated;
create trigger site_content_updated_at before update on public.site_content
for each row execute function private.touch_site_content();
notify pgrst, 'reload schema';
