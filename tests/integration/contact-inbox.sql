-- Approved project only. Every test record is rolled back.
begin;
select set_config('test.contact_request',gen_random_uuid()::text,true);
select set_config('test.contact_email','test-'||gen_random_uuid()::text||'@example.com',true);
select set_config('test.contact_name','Contact test '||gen_random_uuid()::text,true);
set local role anon;
do $$ declare r text; begin
 r:=public.submit_contact(current_setting('test.contact_request')::uuid,current_setting('test.contact_name'),current_setting('test.contact_email'),'A complete test contact message.','en');
 if r<>'sent' then raise exception 'Submission failed: %',r; end if;
 r:=public.submit_contact(current_setting('test.contact_request')::uuid,current_setting('test.contact_name'),current_setting('test.contact_email'),'A complete test contact message.','en');
 if r<>'sent' then raise exception 'Idempotent retry failed'; end if;
 r:=public.submit_contact(gen_random_uuid(),current_setting('test.contact_name'),current_setting('test.contact_email'),'A complete test contact message.','en');
 if r<>'sent' then raise exception 'Duplicate body check failed'; end if;
 r:=public.submit_contact(current_setting('test.contact_request')::uuid,current_setting('test.contact_name'),current_setting('test.contact_email'),'Different body on same request id.','en');
 if r<>'invalid' then raise exception 'Request id reuse accepted'; end if;
 r:=public.submit_contact(gen_random_uuid(),current_setting('test.contact_name'),current_setting('test.contact_email'),'Another complete test contact message.','en');
 if r<>'rate_limited' then raise exception 'Burst limit bypassed'; end if;
 r:=public.submit_contact(gen_random_uuid(),'x','invalid','short','zz');
 if r<>'invalid' then raise exception 'Invalid input accepted'; end if;
 begin perform id from public.messages; raise exception 'Public inbox read accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.messages(name,email,message) values('Test','test@example.com','Bypass attempt'); raise exception 'Direct insert accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.messages where name=current_setting('test.contact_name'))<>1 then raise exception 'Duplicate messages created'; end if;
end $$;
select set_config('test.contact_id',id::text,true) from public.messages where name=current_setting('test.contact_name');
-- Simulate prior accepted traffic without creating extra inbox messages.
insert into private.contact_receipts(request_id,email_hash,payload_hash,created_at)
select gen_random_uuid(),sha256(convert_to(current_setting('test.contact_email'),'UTF8')),sha256(convert_to('test-'||i,'UTF8')),now()-interval '5 minutes' from generate_series(1,2) i;
update private.contact_receipts set created_at=now()-interval '5 minutes' where request_id=current_setting('test.contact_request')::uuid;
set local role anon;
do $$ begin
 if public.submit_contact(gen_random_uuid(),'Test Name',current_setting('test.contact_email'),'Hourly limit test message.','en')<>'rate_limited' then raise exception 'Hourly limit bypassed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","email":"eheeba@gmail.com"}',true);
set local role authenticated;
do $$ declare n integer; begin
 if exists(select 1 from public.messages) then raise exception 'Non-owner inbox read accepted'; end if;
 update public.messages set read_at=now() where id=current_setting('test.contact_id')::uuid;
 get diagnostics n=row_count;if n<>0 then raise exception 'Non-owner update accepted'; end if;
 delete from public.messages where id=current_setting('test.contact_id')::uuid;
 get diagnostics n=row_count;if n<>0 then raise exception 'Non-owner delete accepted'; end if;
 begin perform request_id from private.contact_receipts;raise exception 'Receipt read accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated')::text,true) from auth.users where lower(email)='eheeba@gmail.com' and email_confirmed_at is not null;
set local role authenticated;
do $$ declare n integer;begin
 if not exists(select 1 from public.messages where id=current_setting('test.contact_id')::uuid) then raise exception 'Owner read failed';end if;
 update public.messages set read_at=now() where id=current_setting('test.contact_id')::uuid and read_at is null;
 get diagnostics n=row_count;if n<>1 then raise exception 'Owner read-state update failed';end if;
 update public.messages set read_at=null where id=current_setting('test.contact_id')::uuid;
 begin update public.messages set message='Changed body' where id=current_setting('test.contact_id')::uuid;raise exception 'Body rewrite accepted';exception when insufficient_privilege then null;end;
 delete from public.messages where id=current_setting('test.contact_id')::uuid;
 get diagnostics n=row_count;if n<>1 then raise exception 'Owner delete failed';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if public.submit_contact(current_setting('test.contact_request')::uuid,current_setting('test.contact_name'),current_setting('test.contact_email'),'A complete test contact message.','en')<>'sent' then raise exception 'Receipt lost on inbox deletion';end if;
end $$;
reset role;
do $$ begin if exists(select 1 from public.messages where id=current_setting('test.contact_id')::uuid) then raise exception 'Deleted message resurrected';end if;end $$;
rollback;
select 'passed: public submission, validation, duplicate suppression, throttling, inbox privacy, owner read-state/delete, content immutability; fixtures rolled back' as result;
