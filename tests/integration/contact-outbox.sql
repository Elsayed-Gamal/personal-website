-- Rollback includes pg_net's queue, so no email is sent by this test.
begin;
select set_config('test.request',gen_random_uuid()::text,true);
select set_config('test.email','outbox-'||gen_random_uuid()::text||'@example.com',true);
set local role anon;
do $$ begin
 if public.submit_contact_queued(current_setting('test.request')::uuid,'Queue test',current_setting('test.email'),'A transactional notification test.','en')<>'sent' then raise exception 'Submit failed'; end if;
 if public.submit_contact_queued(current_setting('test.request')::uuid,'Queue test',current_setting('test.email'),'A transactional notification test.','en')<>'sent' then raise exception 'Retry failed'; end if;
 if public.submit_contact_queued(current_setting('test.request')::uuid,'Queue test',current_setting('test.email'),'Changed request payload.','en')<>'invalid' then raise exception 'Changed payload accepted'; end if;
 begin perform * from private.contact_notification_outbox; raise exception 'Outbox exposed'; exception when insufficient_privilege then null; end;
 begin perform private.deliver_contact_notifications(); raise exception 'Worker exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare mid uuid; http_id bigint; begin
 select message_id into mid from private.contact_receipts where request_id=current_setting('test.request')::uuid;
 if (select count(*) from private.contact_notification_outbox where message_id=mid)<>1 then raise exception 'Queue duplicated'; end if;
 perform private.deliver_contact_notifications();
 select request_id into http_id from private.contact_notification_outbox where message_id=mid;
 if http_id is null then raise exception 'Worker not configured or queue not dispatched'; end if;
 if not exists(select 1 from net.http_request_queue where id=http_id and url='https://api.resend.com/emails') then raise exception 'Wrong provider'; end if;
 insert into net._http_response(id,status_code,content_type,headers,content,timed_out) values(http_id,503,'application/json','{}','{}',false);
 perform private.deliver_contact_notifications();
 if not exists(select 1 from private.contact_notification_outbox where message_id=mid and attempts=1 and request_id is null and next_attempt_at>now() and sent_at is null) then raise exception 'Retry not scheduled'; end if;
 update private.contact_notification_outbox set next_attempt_at=now() where message_id=mid;
 perform private.deliver_contact_notifications();
 select request_id into http_id from private.contact_notification_outbox where message_id=mid;
 insert into net._http_response(id,status_code,content_type,headers,content,timed_out) values(http_id,200,'application/json','{}','{}',false);
 perform private.deliver_contact_notifications();
 if not exists(select 1 from private.contact_notification_outbox where message_id=mid and attempts=2 and sent_at is not null) then raise exception 'Success not recorded'; end if;
end $$;
rollback;
select 'PASS: atomic enqueue, duplicate prevention, worker permissions, async dispatch, backoff and completion; no emails sent' as result;
