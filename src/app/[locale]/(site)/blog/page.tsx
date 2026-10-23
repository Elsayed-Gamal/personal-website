import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/blog/article-card";
import { isLocale } from "@/lib/content";
import { getArticles, getSiteContent } from "@/lib/db/content";

export const metadata: Metadata = { title: "Writing" };

export default async function BlogPage({
  params,
}: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [articles, copy] = await Promise.all([
    getArticles(),
    getSiteContent("blog", locale),
  ]);
  return (
    <section className="container-shell py-20 sm:py-28">
      <header className="mb-16 max-w-4xl">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-[-.035em] text-balance sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-6 max-w-2xl leading-8 text-[#586779]">{copy.text}</p>
      </header>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} locale={locale} />
        ))}
      </div>
    </section>
  );
}
