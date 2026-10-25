-- Personal website only; fixtures and deletion reservations are rolled back.
begin;
select set_config('test.media_path','projects/'||gen_random_uuid()::text||'.png',true);
select set_config('test.media_id','media-test-'||gen_random_uuid()::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated')::text,true)
from auth.users where lower(email)='eheeba@gmail.com' and email_confirmed_at is not null;
set local role authenticated;
do $$
declare e jsonb; v timestamptz; item text:=current_setting('test.media_id'); p text:=current_setting('test.media_path');
begin
  if not private.is_site_owner() then raise exception 'Owner missing'; end if;
  insert into storage.objects(bucket_id,name,metadata) values('content-images',p,'{"size":1000}');
  if not exists(select 1 from public.list_content_images(0,25,'projects') where path=p and not in_use and not deleting) then raise exception 'Library object missing'; end if;
  if exists(select 1 from public.list_content_images(0,25,'articles') where path=p) then raise exception 'Folder filter failed'; end if;
  e:=jsonb_build_object('kind','article','id',item,'updated_at',null,'published',false,'date','2026-10-25','reading_time',3,'category',jsonb_build_object('ar','اختبار','en','Test'),
    'cover_image_path',p,'cover_image_url',null,'translations',jsonb_build_array(jsonb_build_object('locale','ar','slug',item,'title','اختبار','excerpt','ملخص','body','نص','published',true)));
  v:=public.save_site_entry(e);
  if not exists(select 1 from public.articles where id=item and cover_image_path=p) then raise exception 'Cross-folder reuse failed'; end if;
  if not exists(select 1 from public.list_content_images(0,25,'all') where path=p and in_use) then raise exception 'Usage detection failed'; end if;
  begin perform public.prepare_content_image_deletion(p); raise exception 'Used image deletion allowed'; exception when foreign_key_violation then null; end;
  v:=public.save_site_entry(e||jsonb_build_object('updated_at',v,'cover_image_path',null,'cover_image_url','https://images.example.com/cover.png'));
  if not exists(select 1 from public.articles where id=item and cover_image_path is null and cover_image_url='https://images.example.com/cover.png') then raise exception 'External cover not persisted'; end if;
  begin
    perform public.save_site_entry(e||jsonb_build_object('updated_at',v,'cover_image_url','https://images.example.com/cover.png'));
    raise exception 'Dual source accepted';
  exception when check_violation then null; end;
  begin
    perform public.save_site_entry(e||jsonb_build_object('updated_at',v,'cover_image_path',null,'cover_image_url','javascript:alert(1)'));
    raise exception 'Unsafe URL accepted';
  exception when check_violation then null; end;
  update public.article_translations set body='![image](https://cdoaudugbjrkhyhivaaa.supabase.co/storage/v1/object/public/content-images/'||p||')' where article_id=item;
  begin perform public.prepare_content_image_deletion(p); raise exception 'Markdown reference ignored'; exception when foreign_key_violation then null; end;
  update public.article_translations set body='نص' where article_id=item;
  update public.site_content set value=jsonb_set(value,'{seo,imageUrl}',to_jsonb('https://cdoaudugbjrkhyhivaaa.supabase.co/storage/v1/object/public/content-images/'||p)) where key='ui' and locale='ar';
  begin perform public.prepare_content_image_deletion(p); raise exception 'SEO reference ignored'; exception when foreign_key_violation then null; end;
  update public.site_content set value=jsonb_set(value,'{seo,imageUrl}','""') where key='ui' and locale='ar';
  perform public.prepare_content_image_deletion(p);
  perform public.prepare_content_image_deletion(p); -- retry is idempotent
  if not exists(select 1 from public.list_content_images(0,25,'all') where path=p and deleting) then raise exception 'Reservation missing'; end if;
  begin perform public.save_site_entry(e||jsonb_build_object('updated_at',v)); raise exception 'Pending deletion reused'; exception when foreign_key_violation then null; end;
  begin update public.article_translations set body=p where article_id=item; raise exception 'Deleted image reused in Markdown'; exception when foreign_key_violation then null; end;
  begin update public.site_content set value=jsonb_set(value,'{seo,imageUrl}',to_jsonb('https://cdoaudugbjrkhyhivaaa.supabase.co/storage/v1/object/public/content-images/'||p)) where key='ui' and locale='ar'; raise exception 'Deleted image reused in settings'; exception when foreign_key_violation then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  begin perform public.list_content_images(); raise exception 'Anonymous library access'; exception when insufficient_privilege then null; end;
  begin perform public.prepare_content_image_deletion(current_setting('test.media_path')); raise exception 'Anonymous delete reservation'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","email":"eheeba@gmail.com"}',true);
set local role authenticated;
do $$ begin
  begin perform public.list_content_images(); raise exception 'Non-owner library access'; exception when insufficient_privilege then null; end;
  begin perform public.prepare_content_image_deletion(current_setting('test.media_path')); raise exception 'Non-owner delete reservation'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: library permissions, folders, external covers, cross-folder reuse, used-image protection, Markdown/SEO references, deletion reservation and retry' as result;
