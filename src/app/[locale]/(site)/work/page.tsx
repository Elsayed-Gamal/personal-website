import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectCard } from "@/components/portfolio/project-card";
import { isLocale, projects } from "@/lib/content";

export const metadata: Metadata = { title: "Selected work" };

export default async function WorkPage({
  params,
}: PageProps<"/[locale]/work">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy =
    locale === "ar"
      ? {
          eyebrow: "المشاريع",
          title: "أعمال مختارة جمعت بين التفكير في المنتج والتنفيذ التقني.",
          text: "دراسات حالة تجريبية تحدد شكل العرض النهائي، وسيتم استبدالها بالمشاريع والنتائج الحقيقية.",
        }
      : {
          eyebrow: "Selected work",
          title: "Work that connects product thinking with solid engineering.",
          text: "Illustrative case studies defining the final presentation, ready to be replaced with real projects and outcomes.",
        };
  return (
    <section className="container-shell py-20 sm:py-28">
      <header className="mb-16 max-w-4xl">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-[-.035em] text-balance sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-6 max-w-2xl leading-8 text-[#586779]">{copy.text}</p>
      </header>
      <div className="work-grid">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} locale={locale} />
        ))}
      </div>
    </section>
  );
}
