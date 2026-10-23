"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/content";
import { ui } from "@/lib/content";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const otherLocale = locale === "ar" ? "en" : "ar";
  const target = pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${otherLocale}`);

  return (
    <Link
      href={target}
      className="language-switch"
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {ui[locale].language}
    </Link>
  );
}
