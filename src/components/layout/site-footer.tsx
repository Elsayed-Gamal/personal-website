import Link from "next/link";
import { ui, type Locale } from "@/lib/content";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = ui[locale];
  return (
    <footer className="site-footer">
      <div className="container-shell footer-main">
        <div>
          <Link href={`/${locale}`} className="footer-name">
            {locale === "ar" ? "السيد جمال" : "Elsayed Gamal"}
            <span>.</span>
          </Link>
          <p>{t.footer}</p>
        </div>
        <nav
          aria-label={
            locale === "ar" ? "روابط أسفل الصفحة" : "Footer navigation"
          }
        >
          <Link href={`/${locale}/work`}>{t.nav.work}</Link>
          <Link href={`/${locale}/blog`}>{t.nav.blog}</Link>
          <Link href={`/${locale}/about`}>{t.nav.about}</Link>
          <Link href={`/${locale}/contact`}>{t.nav.contact}</Link>
        </nav>
      </div>
      <div className="container-shell footer-bottom">
        <span>© {new Date().getFullYear()} · Elsayed Gamal</span>
        <span>
          {locale === "ar"
            ? "صُنع بعناية، حتى أصغر التفاصيل."
            : "Thoughtfully built, down to the details."}
        </span>
      </div>
    </footer>
  );
}
