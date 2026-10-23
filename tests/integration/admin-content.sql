-- Personal website only. All fixture changes are rolled back.
begin;
select set_config('test.content_id','content-test-'||gen_random_uuid()::text,true);
select set_config('test.project_id','project-test-'||gen_random_uuid()::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated')::text,true) from auth.users where lower(email)='eheeba@gmail.com' and email_confirmed_at is not null;
select set_config('test.owner_claims',current_setting('request.jwt.claims'),true);
set local role authenticated;
do $$
declare e jsonb; v timestamptz; item text:=current_setting('test.content_id'); p text:=current_setting('test.project_id');
begin
 e:=jsonb_build_object('kind','article','id',item,'updated_at',null,'published',false,'date','2026-10-24','reading_time',3,'category',jsonb_build_object('ar','اختبار','en','Test'),'translations',jsonb_build_array(
 jsonb_build_object('locale','ar','slug',item||'-ar','title','مقال اختبار','excerpt','ملخص','body','نص تجريبي','published',true),
 jsonb_build_object('locale','en','slug',item||'-en','title','Test','excerpt','Excerpt','body','Body','published',false)));
 v:=public.save_site_entry(e);
 perform set_config('test.entry',(e||jsonb_build_object('updated_at',v))::text,true);
 if not exists(select 1 from public.articles where id=item and not published) then raise exception 'Draft save failed'; end if;
 begin
   perform public.save_site_entry(e||jsonb_build_object('id',item||'-collision'));
   raise exception 'Duplicate slug accepted';
 exception when unique_violation then null; end;
 if exists(select 1 from public.articles where id=item||'-collision') then raise exception 'Partial insert survived rollback'; end if;
 begin
   perform public.save_site_entry(e||jsonb_build_object('updated_at','2000-01-01T00:00:00Z','published',true));
   raise exception 'Stale update accepted';
 exception when serialization_failure then null; end;
 perform public.save_site_entry(jsonb_build_object('kind','project','id',p,'updated_at',null,'published',false,'year','2026','sort_order',99,'color','cyan','stack',jsonb_build_array('Next.js'),'translations',jsonb_build_array(
 jsonb_build_object('locale','ar','title','مشروع','summary','ملخص','body','تفاصيل','category','ويب'),
 jsonb_build_object('locale','en','title','Project','summary','Summary','body','Details','category','Web'))));
end $$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from public.articles where id=current_setting('test.content_id')) or exists(select 1 from public.projects where slug=current_setting('test.project_id')) or exists(select 1 from public.article_translations where article_id=current_setting('test.content_id')) then raise exception 'Draft leaked'; end if;
 begin perform public.save_site_entry(current_setting('test.entry')::jsonb); raise exception 'Anon save accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","email":"eheeba@gmail.com","user_metadata":{"role":"admin"}}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.articles where id=current_setting('test.content_id')) then raise exception 'Non-owner draft leak'; end if;
 begin perform public.save_site_entry(current_setting('test.entry')::jsonb); raise exception 'Non-owner save accepted'; exception when insufficient_privilege then null; end;
 begin perform public.delete_site_entry('article',current_setting('test.content_id'),(current_setting('test.entry')::jsonb->>'updated_at')::timestamptz); raise exception 'Non-owner delete accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims',current_setting('test.owner_claims'),true);
set local role authenticated;
do $$ declare e jsonb:=current_setting('test.entry')::jsonb; v timestamptz; begin
 v:=public.save_site_entry(e||jsonb_build_object('published',true));
 perform set_config('test.entry',(e||jsonb_build_object('published',true,'updated_at',v))::text,true);
end $$;
reset role;
set local role anon;
do $$ begin
 if not exists(select 1 from public.articles where id=current_setting('test.content_id')) then raise exception 'Published article missing'; end if;
 if (select count(*) from public.article_translations where article_id=current_setting('test.content_id'))<>1 then raise exception 'Hidden translation leaked'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',current_setting('test.owner_claims'),true);
set local role authenticated;
do $$ declare e jsonb:=current_setting('test.entry')::jsonb; v timestamptz; begin
 v:=public.save_site_entry(e||jsonb_build_object('published',false));
 perform set_config('test.entry',(e||jsonb_build_object('published',false,'updated_at',v))::text,true);
 begin perform public.delete_site_entry('article',e->>'id',(e->>'updated_at')::timestamptz); raise exception 'Stale delete accepted'; exception when serialization_failure then null; end;
end $$;
reset role;
set local role anon;
do $$ begin if exists(select 1 from public.articles where id=current_setting('test.content_id')) then raise exception 'Unpublished article still visible'; end if; end $$;
reset role;
select set_config('request.jwt.claims',current_setting('test.owner_claims'),true);
set local role authenticated;
do $$ declare e jsonb:=current_setting('test.entry')::jsonb; v timestamptz; begin
 perform public.delete_site_entry('article',e->>'id',(e->>'updated_at')::timestamptz);
 if exists(select 1 from public.article_translations where article_id=e->>'id') then raise exception 'Translations not cascaded'; end if;
 select updated_at into v from public.projects where slug=current_setting('test.project_id');
 perform public.delete_site_entry('project',current_setting('test.project_id'),v);
 if exists(select 1 from public.project_translations where project_slug=current_setting('test.project_id')) then raise exception 'Project translations not cascaded'; end if;
end $$;
reset role;
rollback;
select 'passed: CRUD, draft privacy, translation privacy, atomic rollback, stale save/delete, non-owner/anonymous denial, unpublish and cascade delete; fixtures rolled back' as result;
