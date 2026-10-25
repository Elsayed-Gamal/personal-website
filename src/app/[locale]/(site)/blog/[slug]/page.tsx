import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { getArticleLocale, isLocale } from "@/lib/content";
import { findArticleBySlug, getSiteContent, getSiteUI } from "@/lib/db/content";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug: routeSlug } = await params;
  if (!isLocale(locale)) notFound();
  let slug: string;
  try {
    slug = decodeURIComponent(routeSlug);
  } catch {
    notFound();
  }
  const article = await findArticleBySlug(slug);
  if (!article) notFound();
  const targetLocale = getArticleLocale(article, locale);
  const translation = article.translations[targetLocale]!;
  if (targetLocale !== locale || translation.slug !== slug)
    redirect(`/${targetLocale}/blog/${encodeURIComponent(translation.slug)}`);
  return buildSeoMetadata(await getSiteUI(locale), locale, {
    title: translation.title,
    description: translation.excerpt,
    path: `/${locale}/blog/${encodeURIComponent(translation.slug)}`,
    article: true,
  });
}

export default async function ArticlePage({
  params,
}: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug: routeSlug } = await params;
  if (!isLocale(locale)) notFound();
  let slug: string;
  try {
    slug = decodeURIComponent(routeSlug);
  } catch {
    notFound();
  }
  const [article, copy] = await Promise.all([
    findArticleBySlug(slug),
    getSiteContent("article_detail", locale),
  ]);
  if (!article) notFound();

  const targetLocale = getArticleLocale(article, locale);
  const translation = article.translations[targetLocale]!;
  if (targetLocale !== locale || translation.slug !== slug)
    redirect(`/${targetLocale}/blog/${encodeURIComponent(translation.slug)}`);

  return (
    <article className="container-shell py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${locale}/blog`}
          className="text-sm text-[#586779] hover:text-[#245bc4]"
        >
          ← {copy.back}
        </Link>
        <header className="hairline mt-14 border-b pb-12">
          <div className="flex flex-wrap gap-3 text-xs tracking-[.13em] text-[#245bc4] uppercase">
            <span>{article.category[locale]}</span>
            <span>·</span>
            <time>{article.date}</time>
            <span>·</span>
            <span>
              {article.readingTime} {copy.minutes}
            </span>
          </div>
          <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-[-.05em] text-balance sm:text-6xl">
            {translation.title}
          </h1>
          <p className="mt-6 text-xl leading-9 text-[#586779]">
            {translation.excerpt}
          </p>
          <p className="mt-7 text-xs text-[#626d80]">{copy.note}</p>
        </header>
        <div className="article-body py-10">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          >
            {translation.body}
          </ReactMarkdown>
        </div>
      </div>
    </article>
  );
}
