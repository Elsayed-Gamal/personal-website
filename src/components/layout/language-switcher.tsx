"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/content";
import { SiteLink as Link } from "@/components/layout/site-link";

export function LanguageSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const otherLocale = locale === "ar" ? "en" : "ar";
  const target = pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${otherLocale}`);

  return (
    <Link
      href={target}
      className="language-switch"
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {label}
    </Link>
  );
}
