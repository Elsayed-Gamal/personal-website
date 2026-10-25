import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { getProjectBySlug, getSiteContent, getSiteUI } from "@/lib/db/content";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/work/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [project, ui] = await Promise.all([
    getProjectBySlug(slug),
    getSiteUI(locale),
  ]);
  if (!project) notFound();
  const content = project.content[locale];
  return buildSeoMetadata(ui, locale, {
    title: content.title,
    description: content.summary,
    path: `/${locale}/work/${encodeURIComponent(project.slug)}`,
  });
}

export default async function ProjectPage({
  params,
}: PageProps<"/[locale]/work/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [project, labels] = await Promise.all([
    getProjectBySlug(slug),
    getSiteContent("project_detail", locale),
  ]);
  if (!project) notFound();
  const content = project.content[locale];
  return (
    <article>
      <section className="container-shell py-16 sm:py-24">
        <Link
          href={`/${locale}/work`}
          className="text-sm text-[#586779] hover:text-[#245bc4]"
        >
          ← {labels.back}
        </Link>
        <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="eyebrow">
              {project.category[locale]} · {project.year}
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-6xl">
              {content.title}
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-[#586779]">
              {content.summary}
            </p>
          </div>
          <div className="hairline border-t pt-6 lg:mt-10">
            <p className="text-xs tracking-[.16em] text-[#687386] uppercase">
              {labels.role}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {project.stack.map((item) => (
                <span
                  key={item}
                  className="hairline rounded-full border px-3 py-1.5 text-sm text-[#586779]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="container-shell">
        <div
          className="project-visual hairline min-h-[28rem] rounded-3xl border bg-[#e7eef9]"
          data-color={project.color}
        >
          <div className="absolute inset-[12%] rounded-2xl border border-white/15 bg-white p-8 shadow-2xl">
            <div className="flex gap-2">
              <i className="size-2 rounded-full bg-red-400" />
              <i className="size-2 rounded-full bg-amber-300" />
              <i className="size-2 rounded-full bg-blue-400" />
            </div>
            <div className="mt-10 grid h-[70%] grid-cols-[.35fr_1fr] gap-5">
              <div className="rounded-xl bg-[#f0f4fa]" />
              <div className="grid grid-rows-[.5fr_1fr] gap-5">
                <div className="rounded-xl bg-[#f0f4fa]" />
                <div className="grid grid-cols-3 gap-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl bg-[#f0f4fa]" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="container-shell grid gap-10 py-24 md:grid-cols-[.55fr_1fr]">
        <div>
          <p className="eyebrow">{labels.overview}</p>
          <p className="mt-4 text-sm text-[#707a8d]">{labels.note}</p>
        </div>
        <div className="article-body whitespace-pre-line">{content.body}</div>
      </section>
      <section className="hairline border-t py-20 text-center">
        <Link
          href={`/${locale}/contact`}
          className="inline-flex items-center gap-3 text-3xl font-semibold tracking-[-.04em] hover:text-[#245bc4]"
        >
          {labels.next}
          <ArrowUpRight className="size-7" />
        </Link>
      </section>
    </article>
  );
}
