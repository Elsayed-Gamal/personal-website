import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  MousePointer2,
  PanelsTopLeft,
} from "lucide-react";
import type { HomeContent, Locale } from "@/lib/content";

export function Hero({
  locale,
  copy,
}: {
  locale: Locale;
  copy: HomeContent["hero"];
}) {
  return (
    <section className="hero-section">
      <div className="container-shell hero-layout">
        <div className="hero-copy">
          <p className="intro-label">
            <span className="label-line" />
            {copy.label}
          </p>
          <h1>
            {copy.title}
            <br />
            <em>{copy.accentTitle}</em>
          </h1>
          <p className="hero-description">{copy.description}</p>
          <div className="hero-actions">
            <Link className="primary-button" href={`/${locale}/contact`}>
              {copy.primaryCta}
              <ArrowUpRight size={18} />
            </Link>
            <Link className="secondary-button" href={`/${locale}/work`}>
              {copy.secondaryCta}
            </Link>
          </div>
          <div className="hero-benefits">
            {copy.benefits.map((item) => (
              <span key={item}>
                <Check size={15} />
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-caption">
            <span>DESIGNED WITH PURPOSE</span>
            <span>01 / 03</span>
          </div>
          <div className="browser-preview">
            <div className="preview-toolbar">
              <span className="window-dots">● ● ●</span>
              <span>your-next-project.com</span>
              <PanelsTopLeft size={13} />
            </div>
            <div className="preview-body">
              <div className="preview-nav">
                <b>
                  studio<span>.</span>
                </b>
                <span>About &nbsp; Work &nbsp; Contact</span>
              </div>
              <div className="preview-content">
                <div>
                  <span className="preview-kicker">A NEW PERSPECTIVE</span>
                  <h2>
                    Good ideas.
                    <br />
                    Beautifully
                    <br />
                    <em>built.</em>
                  </h2>
                  <span className="preview-button">Explore our work ↗</span>
                </div>
                <div className="sculpture">
                  <div className="sculpture-ring" />
                  <div className="sculpture-ball" />
                  <div className="sculpture-plinth" />
                </div>
              </div>
              <div className="preview-bottom">
                <span>Ideas into experiences.</span>
                <span>SCROLL TO DISCOVER ↓</span>
              </div>
            </div>
          </div>
          <div className="design-note">
            <span className="note-icon">
              <Check size={20} />
            </span>
            <div>
              <strong>{copy.detailTitle}</strong>
              <small>{copy.detailText}</small>
            </div>
          </div>
          <div className="cursor-note">
            <MousePointer2 size={22} />
            <span>{copy.cursorLabel}</span>
          </div>
          <div className="art-bottom">
            {copy.artDescription}
            <span>DESIGN + DEVELOPMENT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
