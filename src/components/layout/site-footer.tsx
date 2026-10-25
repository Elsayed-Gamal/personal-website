import type { Locale } from "@/lib/content";
import { getSiteUI } from "@/lib/db/content";
import { SiteLink as Link } from "@/components/layout/site-link";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getSiteUI(locale);
  return (
    <footer className="site-footer">
      <div className="container-shell footer-main">
        <div>
          <Link href={`/${locale}`} className="footer-name">
            {t.brandName}
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
        <span>{t.footerSignature}</span>
      </div>
    </footer>
  );
}
