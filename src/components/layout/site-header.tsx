"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { Locale, SiteUI } from "@/lib/content";

export function SiteHeader({ locale, t }: { locale: Locale; t: SiteUI }) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeMenuOnOutsidePress(event: PointerEvent) {
      const menu = menuRef.current;
      if (
        menu?.open &&
        event.target instanceof Node &&
        !menu.contains(event.target)
      ) {
        menu.open = false;
      }
    }

    document.addEventListener("pointerdown", closeMenuOnOutsidePress, true);
    return () => {
      document.removeEventListener(
        "pointerdown",
        closeMenuOnOutsidePress,
        true,
      );
    };
  }, []);

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="container-shell flex h-20 items-center justify-between gap-5">
        <Link
          href={`/${locale}`}
          className="group flex items-center gap-3.5"
          aria-label={t.nav.home}
        >
          <span className="brand-mark">
            <span>EG</span>
          </span>
          <span className="hidden sm:block">
            <span className="block text-sm font-bold tracking-[-.01em]">
              {t.brandName}
            </span>
            <span className="mt-0.5 block text-[10px] tracking-[.17em] text-[#777873] uppercase">
              {t.brandRole}
            </span>
          </span>
        </Link>

        <nav
          className="nav-pill hidden items-center gap-1 text-sm lg:flex"
          aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary navigation"}
        >
          <Link className="nav-link" href={`/${locale}`}>
            {t.nav.home}
          </Link>
          <Link className="nav-link" href={`/${locale}#services`}>
            {t.nav.services}
          </Link>
          <Link className="nav-link" href={`/${locale}/work`}>
            {t.nav.work}
          </Link>
          <Link className="nav-link" href={`/${locale}/blog`}>
            {t.nav.blog}
          </Link>
          <Link className="nav-link" href={`/${locale}/about`}>
            {t.nav.about}
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher locale={locale} label={t.language} />
          <Link
            href={`/${locale}/contact`}
            className="primary-button hidden items-center gap-2 px-4 py-2.5 text-sm sm:flex"
          >
            {t.nav.contact}
            <ArrowUpRight className="size-4" />
          </Link>
          <details
            ref={menuRef}
            className="mobile-menu relative lg:hidden"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.removeAttribute("open");
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary
              aria-label={locale === "ar" ? "قائمة التنقل" : "Navigation menu"}
              className="grid size-10 cursor-pointer list-none place-items-center rounded-full border border-[#dce3e9] bg-[#f0f4fa]"
            >
              <Menu className="size-4" />
            </summary>
            <nav
              className="absolute end-0 top-13 w-52 rounded-2xl border border-[#dce3e9] bg-white p-2 shadow-2xl"
              onClick={(event) => {
                if (
                  event.target instanceof Element &&
                  event.target.closest("a")
                ) {
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }
              }}
            >
              <Link className="mobile-nav-link" href={`/${locale}`}>
                {t.nav.home}
              </Link>
              <Link className="mobile-nav-link" href={`/${locale}#services`}>
                {t.nav.services}
              </Link>
              <Link className="mobile-nav-link" href={`/${locale}/work`}>
                {t.nav.work}
              </Link>
              <Link className="mobile-nav-link" href={`/${locale}/blog`}>
                {t.nav.blog}
              </Link>
              <Link className="mobile-nav-link" href={`/${locale}/about`}>
                {t.nav.about}
              </Link>
              <Link
                className="mobile-nav-link text-[#245bc4]"
                href={`/${locale}/contact`}
              >
                {t.nav.contact}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
