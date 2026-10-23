-- Personal website only: cdoaudugbjrkhyhivaaa
CREATE TABLE public.projects (
  slug text PRIMARY KEY,
  sort_order integer NOT NULL DEFAULT 0,
  year text NOT NULL,
  color text NOT NULL CHECK (color IN ('cyan','violet','amber')),
  stack text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.project_translations (
  project_slug text NOT NULL REFERENCES public.projects(slug) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('ar','en')),
  title text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL,
  category text NOT NULL,
  PRIMARY KEY (project_slug, locale)
);
CREATE TABLE public.articles (
  id text PRIMARY KEY,
  date date NOT NULL,
  reading_time integer NOT NULL CHECK (reading_time > 0),
  category jsonb NOT NULL CHECK (jsonb_typeof(category) = 'object'),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.article_translations (
  article_id text NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('ar','en')),
  slug text NOT NULL UNIQUE CHECK (length(slug) > 0),
  title text NOT NULL,
  excerpt text NOT NULL,
  body text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  PRIMARY KEY (article_id, locale)
);
CREATE TABLE public.site_content (
  key text NOT NULL CHECK (key IN ('ui','home')),
  locale text NOT NULL CHECK (locale IN ('ar','en')),
  value jsonb NOT NULL CHECK (jsonb_typeof(value) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, locale)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  locale text NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar','en')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_published_order_idx ON public.projects (published, sort_order);
CREATE INDEX articles_published_date_idx ON public.articles (published, date DESC);
CREATE INDEX messages_created_at_idx ON public.messages (created_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.projects, public.project_translations, public.articles,
  public.article_translations, public.site_content, public.messages FROM anon, authenticated;
GRANT SELECT ON public.projects, public.project_translations, public.articles,
  public.article_translations, public.site_content TO anon, authenticated;
GRANT ALL ON public.projects, public.project_translations, public.articles,
  public.article_translations, public.site_content, public.messages TO service_role;

CREATE POLICY "Read published projects" ON public.projects FOR SELECT TO anon, authenticated
  USING (published);
CREATE POLICY "Read published project translations" ON public.project_translations
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.slug = project_slug AND p.published)
  );
CREATE POLICY "Read published articles" ON public.articles FOR SELECT TO anon, authenticated
  USING (published);
CREATE POLICY "Read published article translations" ON public.article_translations
  FOR SELECT TO anon, authenticated USING (
    published AND EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.published)
  );
CREATE POLICY "Read public site copy" ON public.site_content FOR SELECT TO anon, authenticated
  USING (key IN ('ui', 'home'));
COMMENT ON TABLE public.messages IS 'Private contact inbox. No public access; contact endpoint and admin UI are deferred.';
NOTIFY pgrst, 'reload schema';
