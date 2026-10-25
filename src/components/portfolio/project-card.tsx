import { ArrowUpRight } from "lucide-react";
import { ContentCover } from "@/components/ui/content-cover";
import type { Locale, Project } from "@/lib/content";
import { getSiteUI } from "@/lib/db/content";
import { SiteLink as Link } from "@/components/layout/site-link";

export async function ProjectCard({
  project,
  locale,
}: {
  project: Project;
  locale: Locale;
}) {
  const content = project.content[locale];
  const t = await getSiteUI(locale);
  return (
    <Link
      href={`/${locale}/work/${project.slug}`}
      className="case-study-card group"
      pendingIndicator="overlay"
    >
      {project.cover_image_path || project.cover_image_url ? (
        <ContentCover
          path={project.cover_image_path}
          url={project.cover_image_url}
          alt={project.cover_image_alt[locale] || content.title}
          className="project-cover"
          sizes="(max-width: 767px) 90vw, 45vw"
        />
      ) : (
        <div
          className="project-cover"
          data-color={project.color}
          aria-hidden="true"
        >
          <div className="project-mockup" dir="ltr">
            <div className="mockup-top">
              <b>{content.title}</b>
              <span>Overview &nbsp; Explore &nbsp; Settings</span>
            </div>
            {project.color === "cyan" ? (
              <div className="finance-preview">
                <span>Your workspace, at a glance</span>
                <h4>A clearer picture.</h4>
                <div className="chart-bars">
                  {[30, 50, 43, 65, 58, 80, 72, 94].map((height, i) => (
                    <i key={i} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="mockup-pills">
                  <span>Overview</span>
                  <span>Activity</span>
                  <span>Reports</span>
                </div>
              </div>
            ) : (
              <div className="store-preview">
                <div>
                  <small>THE EVERYDAY COLLECTION</small>
                  <h4>
                    Less, but
                    <br />
                    better.
                  </h4>
                  <span>Discover the collection ↗</span>
                </div>
                <div className="store-object">
                  <div />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="project-info">
        <div>
          <p className="eyebrow">{project.category[locale]}</p>
          <h3>{content.title}</h3>
        </div>
        <span className="project-arrow">
          <ArrowUpRight size={22} />
        </span>
      </div>
      <p className="project-summary">{content.summary}</p>
      <span className="project-read">
        {t.viewProject} <span aria-hidden="true">↗</span>
      </span>
    </Link>
  );
}
