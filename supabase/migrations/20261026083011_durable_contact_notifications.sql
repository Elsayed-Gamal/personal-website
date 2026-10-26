-- Only the new queued submission endpoint creates jobs; existing callers remain compatible.
create extension if not exists pg_net with schema extensions;
revoke usage on schema net from public,anon,authenticated;
alter table private.contact_receipts add column message_id uuid references public.messages(id) on delete set null;
create table private.contact_notification_outbox (
 message_id uuid primary key references public.messages(id) on delete cascade,
 created_at timestamptz not null default now(),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 request_id bigint,
 requested_at timestamptz,
 last_status integer,
 sent_at timestamptz
);
alter table private.contact_notification_outbox enable row level security;
revoke all on private.contact_notification_outbox from public,anon,authenticated;
create index contact_outbox_pending_idx on private.contact_notification_outbox(next_attempt_at) where sent_at is null and attempts<6;

create or replace function private.accept_contact(p_request_id uuid,p_name text,p_email text,p_message text,p_locale text) returns text
language plpgsql security definer set search_path=''
as $$
declare
 n text:=btrim(p_name); e text:=lower(btrim(p_email)); m text:=btrim(p_message);
 eh bytea; ph bytea; existing bytea; saved_id uuid;
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
 insert into public.messages(name,email,message,locale) values(n,e,m,p_locale) returning id into saved_id;
 insert into private.contact_receipts(request_id,email_hash,payload_hash,message_id) values(p_request_id,eh,ph,saved_id);
 return 'sent';
end; $$;

create function private.accept_contact_queued(p_request_id uuid,p_name text,p_email text,p_message text,p_locale text) returns text
language plpgsql security definer set search_path='' as $$
declare result text; saved_id uuid;
begin
 -- Validation, deduplication and rate limits remain in the original bounded function.
 result:=private.accept_contact(p_request_id,p_name,p_email,p_message,p_locale);
 if result='sent' then
   select message_id into saved_id from private.contact_receipts where request_id=p_request_id;
   if saved_id is not null then
     insert into private.contact_notification_outbox(message_id) values(saved_id) on conflict do nothing;
   end if;
 end if;
 return result;
end; $$;
revoke all on function private.accept_contact_queued(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function private.accept_contact_queued(uuid,text,text,text,text) to anon,authenticated;
create function public.submit_contact_queued(p_request_id uuid,p_name text,p_email text,p_message text,p_locale text) returns text
language sql security invoker set search_path='' as $$
 select private.accept_contact_queued(p_request_id,p_name,p_email,p_message,p_locale);
$$;
revoke all on function public.submit_contact_queued(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_contact_queued(uuid,text,text,text,text) to anon,authenticated;

-- Runs exclusively as the cron owner. No API role can read secrets, invoke the worker or edit jobs.
create function private.deliver_contact_notifications() returns void
language plpgsql security invoker set search_path='' as $$
declare job record; api_key text; sender text; recipient text; http_id bigint;
begin
  update private.contact_notification_outbox q set
    sent_at=case when r.status_code between 200 and 299 then now() else null end,
    last_status=r.status_code,request_id=null,
    next_attempt_at=now()+make_interval(secs => least(3600,60*power(2,q.attempts-1))::integer)
  from net._http_response r where q.request_id=r.id and q.sent_at is null;
  -- Recover jobs whose worker response was lost or expired, with the same idempotency key.
  update private.contact_notification_outbox set request_id=null,next_attempt_at=now()+interval '1 minute'
  where sent_at is null and request_id is not null and requested_at<now()-interval '5 minutes';
  select decrypted_secret into api_key from vault.decrypted_secrets where name='site_contact_resend_key';
  select decrypted_secret into sender from vault.decrypted_secrets where name='site_contact_sender';
  select decrypted_secret into recipient from vault.decrypted_secrets where name='site_contact_recipient';
  if nullif(api_key,'') is null or nullif(sender,'') is null or nullif(recipient,'') is null then return; end if;
  for job in select q.message_id,m.name,m.email,m.message,m.locale from private.contact_notification_outbox q
    join public.messages m on m.id=q.message_id
    where q.sent_at is null and q.request_id is null and q.attempts<6 and q.next_attempt_at<=now()
    order by q.next_attempt_at limit 10 for update of q skip locked loop
    http_id:=net.http_post(url:='https://api.resend.com/emails',
      headers:=jsonb_build_object('Authorization','Bearer '||api_key,'Content-Type','application/json','Idempotency-Key','contact-message/'||job.message_id::text),
      body:=jsonb_build_object('from',sender,'to',jsonb_build_array(recipient),'reply_to',job.email,
        'subject',case when job.locale='ar' then 'رسالة جديدة من ' else 'New message from ' end||regexp_replace(job.name,E'[\\r\\n]+',' ','g'),
        'text','Name: '||job.name||E'\nEmail: '||job.email||E'\nLanguage: '||job.locale||E'\n\nMessage:\n'||job.message),
      timeout_milliseconds:=10000);
    update private.contact_notification_outbox set request_id=http_id,requested_at=now(),attempts=attempts+1 where message_id=job.message_id;
  end loop;
  delete from private.contact_notification_outbox where sent_at<now()-interval '7 days';
end; $$;
revoke all on function private.deliver_contact_notifications() from public,anon,authenticated;
select cron.schedule('personal-website-contact-notifications','* * * * *','select private.deliver_contact_notifications()');
notify pgrst,'reload schema';
