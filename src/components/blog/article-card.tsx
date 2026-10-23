import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Article, Locale } from "@/lib/content";
import { getArticleLocale, getArticleTranslation } from "@/lib/content";
import { getSiteUI } from "@/lib/db/content";

export async function ArticleCard({
  article,
  locale,
}: {
  article: Article;
  locale: Locale;
}) {
  const articleLocale = getArticleLocale(article, locale);
  const content = getArticleTranslation(article, locale);
  const unavailable = articleLocale !== locale;
  const t = await getSiteUI(locale);

  return (
    <Link
      href={`/${articleLocale}/blog/${content.slug}`}
      className="article-card group flex h-full flex-col"
    >
      <div className="flex items-center justify-between text-[10px] tracking-[.14em] text-[#6f716a] uppercase">
        <span>
          {article.category[locale]} / {article.date.slice(0, 4)}
        </span>
        <span>
          {article.readingTime} {t.minutes}
        </span>
      </div>
      {unavailable ? (
        <span className="mt-5 w-fit rounded-full border border-[#245bc4]/25 bg-[#245bc4]/8 px-3 py-1 text-[10px] text-[#245bc4]">
          {t.originalLanguage}
        </span>
      ) : null}
      <h3
        lang={articleLocale}
        dir={articleLocale === "ar" ? "rtl" : "ltr"}
        className="mt-6 text-xl leading-normal font-semibold tracking-[-.02em] sm:text-2xl"
      >
        {content.title}
      </h3>
      <p
        lang={articleLocale}
        dir={articleLocale === "ar" ? "rtl" : "ltr"}
        className="mt-4 flex-1 text-sm leading-7 text-[#586779]"
      >
        {content.excerpt}
      </p>
      <span className="mt-8 flex items-center justify-between text-xs font-semibold tracking-[.08em] uppercase">
        {t.readArticle}
        <span className="grid size-9 place-items-center rounded-full border border-[#dce3e9] transition group-hover:border-[#245bc4] group-hover:bg-[#245bc4] group-hover:text-white">
          <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
