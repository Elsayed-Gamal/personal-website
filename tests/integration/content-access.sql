-- Run on Personal website (cdoaudugbjrkhyhivaaa) only. All fixtures are rolled back.
BEGIN;
INSERT INTO public.articles (id,date,reading_time,category,published) VALUES
  ('__rls_draft__',current_date,1,'{"ar":"اختبار","en":"Test"}',false),
  ('__rls_published__',current_date,1,'{"ar":"اختبار","en":"Test"}',true);
INSERT INTO public.article_translations (article_id,locale,slug,title,excerpt,body,published) VALUES
  ('__rls_draft__','en','__rls_hidden_parent__','Test','Test','Test',true),
  ('__rls_published__','ar','__rls_hidden_translation__','Test','Test','Test',false),
  ('__rls_published__','en','__rls_visible__','Test','Test','Test',true);
INSERT INTO public.projects (slug,year,color,published) VALUES ('__rls_project__','2026','cyan',false);
INSERT INTO public.project_translations (project_slug,locale,title,summary,body,category)
  VALUES ('__rls_project__','ar','Test','Test','Test','Test');
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.articles WHERE id = '__rls_draft__') THEN RAISE EXCEPTION 'Draft article exposed'; END IF;
  IF EXISTS (SELECT 1 FROM public.article_translations WHERE slug IN ('__rls_hidden_parent__','__rls_hidden_translation__')) THEN RAISE EXCEPTION 'Hidden translation exposed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.article_translations WHERE slug = '__rls_visible__') THEN RAISE EXCEPTION 'Published translation missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.project_translations WHERE project_slug = '__rls_project__') THEN RAISE EXCEPTION 'Draft project exposed'; END IF;
  IF has_table_privilege(current_user, 'public.messages', 'SELECT') THEN RAISE EXCEPTION 'Private inbox exposed'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE grantee = current_user AND table_schema = 'public' AND privilege_type IN ('INSERT','UPDATE','DELETE')) THEN RAISE EXCEPTION 'Public write privilege exposed'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.articles WHERE id = '__rls_draft__') THEN RAISE EXCEPTION 'Draft exposed to non-admin account'; END IF;
  IF EXISTS (SELECT 1 FROM public.messages) THEN RAISE EXCEPTION 'Inbox exposed to non-admin account'; END IF;
  UPDATE public.articles SET published = false WHERE id = '__rls_published__';
  IF FOUND THEN RAISE EXCEPTION 'Non-admin write accepted'; END IF;
END $$;
ROLLBACK;
