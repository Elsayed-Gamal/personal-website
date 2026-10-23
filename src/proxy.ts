import { NextRequest, NextResponse } from "next/server";
import { findArticleBySlug, getArticleLocale, isLocale } from "@/lib/content";

const locales = ["ar", "en"] as const;

function preferredLocale(request: NextRequest) {
  const savedLocale = request.cookies.get("site-locale")?.value;
  if (savedLocale === "ar" || savedLocale === "en") return savedLocale;

  return request.headers.get("accept-language")?.toLowerCase().includes("ar")
    ? "ar"
    : "en";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const locale = preferredLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = pathname.split("/")[1];
  const segments = pathname.split("/");
  if (isLocale(locale) && segments[2] === "blog" && segments.length === 4) {
    let slug: string;
    try {
      slug = decodeURIComponent(segments[3]);
    } catch {
      return NextResponse.next();
    }
    const article = findArticleBySlug(slug);
    if (article) {
      const articleLocale = getArticleLocale(article, locale);
      const translation = article.translations[articleLocale]!;
      if (articleLocale !== locale || translation.slug !== slug) {
        const url = request.nextUrl.clone();
        url.pathname = `/${articleLocale}/blog/${encodeURIComponent(translation.slug)}`;
        const response = NextResponse.redirect(url);
        response.cookies.set("site-locale", articleLocale, {
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
        return response;
      }
    }
  }
  const response = NextResponse.next();
  response.cookies.set("site-locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
