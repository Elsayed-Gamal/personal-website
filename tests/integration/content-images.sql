-- Personal website only. Metadata fixtures and content are rolled back.
begin;
select set_config('test.image_article', 'articles/'||gen_random_uuid()::text||'.png', true);
select set_config('test.image_project', 'projects/'||gen_random_uuid()::text||'.webp', true);
select set_config('request.jwt.claims', jsonb_build_object('sub',id,'role','authenticated')::text,true)
from auth.users where lower(email)='eheeba@gmail.com' and email_confirmed_at is not null;
select set_config('test.image_owner_claims', current_setting('request.jwt.claims'), true);
set local role authenticated;
do $$
declare e jsonb; p jsonb; v timestamptz; item text := 'image-test-'||gen_random_uuid()::text; n integer;
begin
  if not private.is_site_owner() then raise exception 'Owner fixture not available'; end if;
  insert into storage.objects(bucket_id,name) values ('content-images',current_setting('test.image_article')),('content-images',current_setting('test.image_project'));
  begin
    insert into storage.objects(bucket_id,name) values ('content-images','invalid.svg');
    raise exception 'Invalid image path allowed';
  exception when insufficient_privilege then null; end;
  update storage.objects set name='changed.png' where bucket_id='content-images' and name=current_setting('test.image_article');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Overwriting an immutable cover was allowed'; end if;
  begin
    delete from storage.objects where bucket_id='content-images' and name=current_setting('test.image_article');
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'Deleting a live image was allowed'; end if;
  exception when insufficient_privilege then
    -- Current Storage also rejects SQL DELETE at statement level.
    null;
  end;

  e := jsonb_build_object('kind','article','id',item,'updated_at',null,'published',false,'date','2026-10-25','reading_time',3,
    'category',jsonb_build_object('ar','تجربة','en','Test'),'cover_image_path',current_setting('test.image_article'),
    'cover_image_alt',jsonb_build_object('ar','وصف عربي','en','English description'),
    'translations',jsonb_build_array(jsonb_build_object('locale','ar','slug',item,'title','تجربة','excerpt','ملخص','body','محتوى','published',true)));
  v := public.save_site_entry(e);
  if not exists(select 1 from public.articles where id=item and cover_image_path=current_setting('test.image_article') and cover_image_alt->>'ar'='وصف عربي') then
    raise exception 'Article image was not persisted';
  end if;
  -- Old clients without cover fields must not erase an existing image.
  v := public.save_site_entry((e-'cover_image_path'-'cover_image_alt')||jsonb_build_object('updated_at',v));
  if not exists(select 1 from public.articles where id=item and cover_image_path=current_setting('test.image_article')) then raise exception 'Old client erased image'; end if;
  begin
    perform public.save_site_entry(e||jsonb_build_object('updated_at','2000-01-01T00:00:00Z','cover_image_path',null));
    raise exception 'Stale cover write succeeded';
  exception when serialization_failure then null; end;
  begin
    perform public.save_site_entry(e||jsonb_build_object('updated_at',v,'cover_image_path','articles/'||gen_random_uuid()::text||'.png'));
    raise exception 'Nonexistent object accepted';
  exception when foreign_key_violation then null; end;
  -- A project-uploaded image can now be reused in an article via the library.
  v := public.save_site_entry(e||jsonb_build_object('updated_at',v,'cover_image_path',current_setting('test.image_project')));
  v := public.save_site_entry(e||jsonb_build_object('updated_at',v,'cover_image_path',null));
  if not exists(select 1 from public.articles where id=item and cover_image_path is null) then raise exception 'Cover unlink failed'; end if;
  if not exists(select 1 from storage.objects where bucket_id='content-images' and name=current_setting('test.image_article')) then raise exception 'Unlink deleted asset'; end if;

  p := jsonb_build_object('kind','project','id',item,'updated_at',null,'published',false,'year','2026','sort_order',1,'color','cyan','stack',jsonb_build_array('Next.js'),
    'cover_image_path',current_setting('test.image_project'),'cover_image_alt',jsonb_build_object('ar','صورة المشروع','en','Project image'),
    'translations',jsonb_build_array(jsonb_build_object('locale','ar','title','مشروع','summary','ملخص','body','تفاصيل','category','ويب')));
  perform public.save_site_entry(p);
  if not exists(select 1 from public.projects where slug=item and cover_image_path=current_setting('test.image_project')) then raise exception 'Project image not persisted'; end if;
  perform set_config('test.image_entry', e::text, true);
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  begin
    insert into storage.objects(bucket_id,name) values('content-images','articles/'||gen_random_uuid()::text||'.png');
    raise exception 'Anonymous upload allowed';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from storage.objects where bucket_id='content-images') then raise exception 'Anonymous listing allowed'; end if;
end $$;
reset role;
-- Spoofing owner email in a JWT without the real owner's auth.users ID is insufficient.
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","email":"eheeba@gmail.com"}',true);
set local role authenticated;
do $$ begin
  begin
    insert into storage.objects(bucket_id,name) values('content-images','articles/'||gen_random_uuid()::text||'.png');
    raise exception 'Non-owner upload allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_site_entry(current_setting('test.image_entry')::jsonb);
    raise exception 'Non-owner cover save allowed';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from storage.objects where bucket_id='content-images') then raise exception 'Non-owner listing allowed'; end if;
end $$;
reset role;
rollback;
select 'PASS: owner uploads, anonymous/non-owner rejection, immutable assets, article/project cover persistence, stale writes and unlinking' as result;
