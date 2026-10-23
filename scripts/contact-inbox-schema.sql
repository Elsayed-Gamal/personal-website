-- Personal website only. Applied migration: contact_inbox.
create table private.contact_receipts (
  request_id uuid primary key,
  email_hash bytea not null,
  payload_hash bytea not null,
  created_at timestamptz not null default now()
);
alter table private.contact_receipts enable row level security;
revoke all on private.contact_receipts from public,anon,authenticated;
create index contact_receipts_created_idx on private.contact_receipts(created_at);
create index contact_receipts_email_idx on private.contact_receipts(email_hash,created_at);
create index contact_receipts_payload_idx on private.contact_receipts(payload_hash);

grant select,delete on public.messages to authenticated;
grant update(read_at) on public.messages to authenticated;
create policy "Owner reads messages" on public.messages for select to authenticated using ((select private.is_site_owner()));
create policy "Owner marks messages" on public.messages for update to authenticated using ((select private.is_site_owner())) with check ((select private.is_site_owner()));
create policy "Owner deletes messages" on public.messages for delete to authenticated using ((select private.is_site_owner()));

-- The only anonymous write path. No anonymous SELECT or direct INSERT privileges.
-- Definer rights are limited to this validated, throttled insertion into the private inbox.
-- Unlike admin operations, this deliberately accepts unauthenticated contact submissions.
create function private.accept_contact(p_request_id uuid,p_name text,p_email text,p_message text,p_locale text) returns text
language plpgsql security definer set search_path=''
as $$
declare
 n text:=btrim(p_name); e text:=lower(btrim(p_email)); m text:=btrim(p_message);
 eh bytea; ph bytea; existing bytea;
begin
 if p_request_id is null or n is null or e is null or m is null or p_locale is null
   or char_length(n) not between 2 and 100 or char_length(e) not between 3 and 254
   or e !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
   or char_length(m) not between 10 and 5000 or p_locale not in ('ar','en') then
   return 'invalid';
 end if;
 eh:=sha256(convert_to(e,'UTF8'));
 ph:=sha256(convert_to(jsonb_build_array(n,e,m,p_locale)::text,'UTF8'));
 perform pg_advisory_xact_lock(8145072301);
 delete from private.contact_receipts where created_at < now()-interval '24 hours';
 select payload_hash into existing from private.contact_receipts where request_id=p_request_id;
 if found then return case when existing=ph then 'sent' else 'invalid' end; end if;
 if exists(select 1 from private.contact_receipts where payload_hash=ph) then return 'sent'; end if;
 if (select count(*) from private.contact_receipts where created_at>now()-interval '1 hour')>=60
   or (select count(*) from private.contact_receipts where email_hash=eh and created_at>now()-interval '1 hour')>=3
   or exists(select 1 from private.contact_receipts where email_hash=eh and created_at>now()-interval '30 seconds') then
   return 'rate_limited';
 end if;
 insert into public.messages(name,email,message,locale) values(n,e,m,p_locale);
 insert into private.contact_receipts(request_id,email_hash,payload_hash) values(p_request_id,eh,ph);
 return 'sent';
end; $$;
revoke all on function private.accept_contact(uuid,text,text,text,text) from public,anon,authenticated;
grant usage on schema private to anon;
grant execute on function private.accept_contact(uuid,text,text,text,text) to anon,authenticated;
create function public.submit_contact(p_request_id uuid,p_name text,p_email text,p_message text,p_locale text) returns text
language sql security invoker set search_path=''
as $$ select private.accept_contact(p_request_id,p_name,p_email,p_message,p_locale); $$;
revoke all on function public.submit_contact(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_contact(uuid,text,text,text,text) to anon,authenticated;
comment on table public.messages is 'Private contact inbox: bounded public submission via submit_contact, owner-only read/read-state/delete.';
update public.site_content set value=value || jsonb_build_object('form','{"name":"الاسم","email":"البريد الإلكتروني","message":"رسالتك","submit":"إرسال الرسالة","sending":"جارٍ الإرسال…","success":"وصلت رسالتك بنجاح. شكرًا لتواصلك.","error":"تعذر إرسال الرسالة الآن. احتفظ بنصها وحاول مرة أخرى.","invalid":"راجع الاسم والبريد والرسالة قبل الإرسال.","rateLimited":"تم إرسال عدة رسائل مؤخرًا. حاول مرة أخرى بعد ساعة.","privacy":"تُستخدم بياناتك للرد على استفسارك، ولا تظهر لزوار الموقع.","hint":"من 10 إلى 5000 حرف. شاركني فكرتك وما تحتاجه.","another":"إرسال رسالة أخرى"}'::jsonb,'cardText','اكتب رسالتك وسأتواصل معك عبر البريد الإلكتروني الذي تتركه.') where key='contact' and locale='ar';
update public.site_content set value=value || jsonb_build_object('form','{"name":"Name","email":"Email address","message":"Your message","submit":"Send message","sending":"Sending…","success":"Your message has been received. Thank you for getting in touch.","error":"Your message could not be sent right now. Keep your text and try again.","invalid":"Please check your name, email address and message.","rateLimited":"Several messages have been sent recently. Please try again in an hour.","privacy":"Your details are used to respond to your enquiry and are not visible to site visitors.","hint":"10–5,000 characters. Tell me about your idea and what you need.","another":"Send another message"}'::jsonb,'cardText','Send your message and I will get back to you at the email address you provide.') where key='contact' and locale='en';
notify pgrst,'reload schema';
