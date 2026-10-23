import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  MousePointer2,
  PanelsTopLeft,
} from "lucide-react";
import type { Locale } from "@/lib/content";

export function Hero({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <section className="hero-section">
      <div className="container-shell hero-layout">
        <div className="hero-copy">
          <p className="intro-label">
            <span className="label-line" />
            {ar
              ? "السيد جمال · مطور مواقع وتطبيقات"
              : "Elsayed Gamal · Web developer"}
          </p>
          <h1>
            {ar ? (
              <>
                موقع يليق بفكرتك.
                <br />
                <em>وتجربة تقرّب عملاءك.</em>
              </>
            ) : (
              <>
                A home for your idea.
                <br />
                <em>A better experience for your customers.</em>
              </>
            )}
          </h1>
          <p className="hero-description">
            {ar
              ? "أساعدك في تحويل فكرتك إلى موقع أو تطبيق ويب يجمع بين التصميم المتقن وسهولة الاستخدام. من أول تصور إلى منتج جاهز للإطلاق."
              : "I turn your ideas into thoughtfully designed websites and web apps that are easy to use. From the first conversation to a product ready to launch."}
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href={`/${locale}/contact`}>
              {ar ? "لنتحدث عن مشروعك" : "Let's talk about your project"}
              <ArrowUpRight size={18} />
            </Link>
            <Link className="secondary-button" href={`/${locale}/work`}>
              {ar ? "استكشف المشاريع" : "Explore projects"}
            </Link>
          </div>
          <div className="hero-benefits">
            {(ar
              ? [
                  "تصميم يناسب نشاطك",
                  "تجربة ممتازة على الهاتف",
                  "خطوات واضحة من البداية",
                ]
              : [
                  "Designed for your business",
                  "Mobile-friendly experiences",
                  "A clear process",
                ]
            ).map((item) => (
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
              <strong>
                {ar ? "كل تفصيلة لها هدف" : "Every detail has a purpose"}
              </strong>
              <small>
                {ar
                  ? "تصميم واضح. تجربة مريحة."
                  : "Clear design. Effortless experience."}
              </small>
            </div>
          </div>
          <div className="cursor-note">
            <MousePointer2 size={22} />
            <span>{ar ? "فكرتك القادمة" : "Your next idea"}</span>
          </div>
          <div className="art-bottom">
            {ar
              ? "تصور بصري توضيحي لموقع ويب"
              : "An illustrative website concept"}
            <span>DESIGN + DEVELOPMENT</span>
          </div>
        </div>
      </div>
    </section>
  );
}
