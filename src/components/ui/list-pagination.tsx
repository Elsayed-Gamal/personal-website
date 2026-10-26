import { SiteLink } from "@/components/layout/site-link";
import type { Locale } from "@/lib/content";
export function listingPage(value: string | string[] | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1;
}
export function ListPagination({
  page,
  hasMore,
  base,
  locale,
}: {
  page: number;
  hasMore: boolean;
  base: string;
  locale: Locale;
}) {
  if (page === 1 && !hasMore) return null;
  return (
    <nav
      aria-label={locale === "ar" ? "صفحات المحتوى" : "Content pages"}
      className="mt-10 flex items-center justify-center gap-6"
    >
      {page > 1 && (
        <SiteLink href={`${base}?page=${page - 1}`}>
          {locale === "ar" ? "السابق" : "Previous"}
        </SiteLink>
      )}
      <span>
        {locale === "ar" ? "صفحة" : "Page"} {page}
      </span>
      {hasMore && (
        <SiteLink href={`${base}?page=${page + 1}`}>
          {locale === "ar" ? "التالي" : "Next"}
        </SiteLink>
      )}
    </nav>
  );
}
