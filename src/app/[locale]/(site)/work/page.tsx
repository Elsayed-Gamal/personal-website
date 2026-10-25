import { notFound } from "next/navigation";
import { ProjectCard } from "@/components/portfolio/project-card";
import { isLocale } from "@/lib/content";
import { getProjects, getSiteContent } from "@/lib/db/content";

import { getPageMetadata } from "@/lib/db/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/work">) {
  return getPageMetadata((await params).locale, "work");
}

export default async function WorkPage({
  params,
}: PageProps<"/[locale]/work">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [projects, copy] = await Promise.all([
    getProjects(),
    getSiteContent("work", locale),
  ]);
  return (
    <section className="container-shell py-20 sm:py-28">
      <header className="mb-16 max-w-4xl">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-[-.035em] text-balance sm:text-5xl">
          {copy.title}
        </h1>
        {copy.text && (
          <p className="mt-6 max-w-2xl leading-8 text-[#586779]">{copy.text}</p>
        )}
      </header>
      <div className="work-grid">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} locale={locale} />
        ))}
      </div>
    </section>
  );
}
