import Link from "next/link";
import { ArrowUpRight, Globe2, Layers, ShoppingBag } from "lucide-react";
import { notFound } from "next/navigation";
import { Hero } from "@/components/home/hero";
import { ProjectCard } from "@/components/portfolio/project-card";
import { ArticleCard } from "@/components/blog/article-card";
import { isLocale } from "@/lib/content";
import { getArticles, getHomeContent, getProjects } from "@/lib/db/content";

const serviceIcons = {
  globe: Globe2,
  layers: Layers,
  "shopping-bag": ShoppingBag,
} as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [articles, projects, copy] = await Promise.all([
    getArticles(),
    getProjects(),
    getHomeContent(locale),
  ]);
  return (
    <>
      <Hero locale={locale} copy={copy.hero} />
      <section id="services" className="section-space services-section">
        <div className="container-shell">
          <div className="section-intro">
            <p className="eyebrow">{copy.services.eyebrow}</p>
            <h2>{copy.services.title}</h2>
            <p>{copy.services.description}</p>
          </div>
          <div className="services-grid">
            {copy.services.items.map(({ icon, title, text, tag }, i) => {
              const Icon = serviceIcons[icon];
              return (
                <article className="service-card" key={title}>
                  <div className="service-top">
                    <span className="service-icon">
                      <Icon size={24} />
                    </span>
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <div className="service-bottom">
                    <span>{tag}</span>
                    <Link href={`/${locale}/contact`} aria-label={title}>
                      <ArrowUpRight size={20} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section-space container-shell">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{copy.work.eyebrow}</p>
            <h2>{copy.work.title}</h2>
            <p className="section-description">{copy.work.description}</p>
          </div>
          <Link className="text-link" href={`/${locale}/work`}>
            {copy.work.link}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="work-grid">
          {projects.slice(0, 2).map((project) => (
            <ProjectCard key={project.slug} project={project} locale={locale} />
          ))}
        </div>
      </section>
      <section className="process-section section-space">
        <div className="container-shell">
          <div className="section-intro">
            <p className="eyebrow">{copy.process.eyebrow}</p>
            <h2>{copy.process.title}</h2>
            <p>{copy.process.description}</p>
          </div>
          <div className="steps-grid">
            {copy.process.steps.map(({ title, text }, i) => (
              <div className="step" key={title}>
                <span className="step-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section-space container-shell">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{copy.journal.eyebrow}</p>
            <h2>{copy.journal.title}</h2>
          </div>
          <Link className="text-link" href={`/${locale}/blog`}>
            {copy.journal.link}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="journal-grid">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      </section>
      <section className="container-shell cta-wrap">
        <div className="cta-panel">
          <div>
            <p className="eyebrow">{copy.cta.eyebrow}</p>
            <h2>{copy.cta.title}</h2>
            <p>{copy.cta.description}</p>
          </div>
          <Link href={`/${locale}/contact`} className="primary-button">
            {copy.cta.button}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
